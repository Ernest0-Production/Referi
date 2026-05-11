import type { PrismaClient } from "@prisma/client";
import { randomUuid } from "@/lib/randomUuid";
import { env } from "@/env";
import { paymentProvider, refundEscrowOrThrow } from "@/server/services/paymentService";
import { ru } from "@/locales";

async function referrerPayoutDestination(db: PrismaClient, referrerId: string): Promise<string> {
  const u = await db.user.findUnique({
    where: { id: referrerId },
    select: { yookassaPayoutDestination: true },
  });
  const d = u?.yookassaPayoutDestination?.trim();
  if (d) return d;
  return env.YOOKASSA_PAYOUT_MOCK_WALLET;
}

/**
 * Завершает эскроу по заявке перед физическим удалением строк: payout при OFFER_ACCEPTED или возврат соискателю.
 */
export async function syncEscrowFinancialsBeforeAccountDeletion(
  db: PrismaClient,
  applicationId: string,
): Promise<void> {
  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      escrowTx: true,
      vacancy: { select: { referrerId: true } },
    },
  });

  if (!app) return;

  const tx = app.escrowTx;
  if (!tx?.yookassaPaymentId) return;
  if (tx.yookassaPayoutId) return;
  if (tx.status === "CAPTURED" || tx.status === "REFUNDED") return;

  if (tx.status === "HELD") {
    if (app.status === "OFFER_ACCEPTED" && tx.yookassaDealId && !tx.yookassaPayoutId) {
      const idempotencyKey = `offer-accepted:${applicationId}`;
      const dest = await referrerPayoutDestination(db, app.vacancy.referrerId);
      const payout = await paymentProvider.createDealPayout({
        idempotencyKey,
        dealId: tx.yookassaDealId,
        amountKopecks: tx.netPayoutKopecks,
        description: ru.server.accountDeletion.reward(applicationId),
        yooMoneyWallet: dest,
        metadata: { referrerId: app.vacancy.referrerId, applicationId },
      });

      await db.escrowTransaction.update({
        where: { id: tx.id },
        data: {
          yookassaPayoutId: payout.payoutId,
          capturedAt: new Date(),
          status: "CAPTURED",
        },
      });
      return;
    }

    const idempotencyKey = `account-delete-refund:${applicationId}:${randomUuid()}`;
    const res = await refundEscrowOrThrow({
      idempotencyKey,
      escrow: {
        yookassaPaymentId: tx.yookassaPaymentId,
        yookassaDealId: tx.yookassaDealId,
        amountKopecks: tx.amountKopecks,
        netPayoutKopecks: tx.netPayoutKopecks,
      },
      description: ru.server.accountDeletion.refundApplication(applicationId),
    });

    await db.escrowTransaction.update({
      where: { id: tx.id },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        yookassaRefundId: res.refundId,
      },
    });
  }
}

/** Возврат оплаты неиспользованного токена запроса перед удалением пользователя. */
export async function syncPaidTokenRefundBeforeAccountDeletion(
  db: PrismaClient,
  tokenId: string,
): Promise<void> {
  const tok = await db.paidApplicationToken.findUnique({ where: { id: tokenId } });
  if (!tok?.yookassaPaymentId || tok.refundedAt || tok.usedAt) return;

  const idempotencyKey = `account-delete-token:${tokenId}:${randomUuid()}`;
  await paymentProvider.refundPayment({
    idempotencyKey,
    paymentId: tok.yookassaPaymentId,
    amountKopecks: tok.amountKopecks,
    description: ru.server.accountDeletion.refundToken(tokenId),
  });

  await db.paidApplicationToken.update({
    where: { id: tokenId },
    data: { refundedAt: new Date() },
  });
}
