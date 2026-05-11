/**
 * Payment Worker — эскроу Safe deal (выплата), возвраты, проверка регистрации, продление PRO.
 */

import { randomUuid } from "@/lib/randomUuid";
import { Worker, type Job } from "bullmq";
import { env } from "@/env";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { paymentProvider, refundEscrowOrThrow } from "@/server/services/paymentService";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { getPaymentQueue, type PaymentJobData } from "@/server/workers/paymentQueue";
import { scheduleSubscriptionRenewRetry } from "@/server/workers/subscriptionRenewalScheduler";

export type { PaymentJobData, PaymentJobType } from "@/server/workers/paymentQueue";

async function getReferrerPayoutDestination(referrerId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { yookassaPayoutDestination: true },
  });
  const d = u?.yookassaPayoutDestination?.trim();
  if (d) return d;
  return env.YOOKASSA_PAYOUT_MOCK_WALLET;
}

export async function scheduleRefundSeeker(
  applicationId: string,
  amountKopecks: bigint,
  idempotencyKey: string,
) {
  await getPaymentQueue().add(
    "payment-job",
    {
      type: "refund-seeker",
      applicationId,
      amountKopecks: amountKopecks.toString(),
      idempotencyKey,
    },
    { jobId: `refund-seeker:${applicationId}` },
  );
}

export async function scheduleOfferAcceptedPayout(applicationId: string) {
  const idempotencyKey = `offer-accepted:${applicationId}`;
  await getPaymentQueue().add(
    "payment-job",
    { type: "offer-accepted", applicationId, idempotencyKey },
    { jobId: `offer-accepted:${applicationId}` },
  );
}

export async function scheduleRefundPaidToken(tokenId: string, idempotencyKey: string) {
  await getPaymentQueue().add(
    "payment-job",
    { type: "refund-paid-token", tokenId, idempotencyKey },
    { jobId: `refund-paid-token:${tokenId}` },
  );
}

async function processJob(job: Job<PaymentJobData>) {
  const { type, applicationId, amountKopecks, idempotencyKey, tokenId } = job.data;

  switch (type) {
    case "offer-accepted": {
      if (!applicationId) throw new Error("offer-accepted: missing applicationId");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true, vacancy: { select: { referrerId: true } } },
      });
      if (!app?.escrowTx?.yookassaPaymentId) {
        console.log(
          `[paymentWorker] offer-accepted: no escrow payment for ${applicationId}, skipping`,
        );
        return;
      }
      const dealId = app.escrowTx.yookassaDealId;
      if (!dealId) {
        console.log(`[paymentWorker] offer-accepted: no deal id for ${applicationId}, skipping`);
        return;
      }

      const { escrowTx, vacancy } = app;
      const dest = await getReferrerPayoutDestination(vacancy.referrerId);
      const payout = await paymentProvider.createDealPayout({
        idempotencyKey,
        dealId,
        amountKopecks: escrowTx.netPayoutKopecks,
        description: `Реферальное вознаграждение по заявке ${applicationId}`,
        yooMoneyWallet: dest,
        metadata: { referrerId: vacancy.referrerId, applicationId },
      });

      await prisma.escrowTransaction.update({
        where: { id: escrowTx.id },
        data: {
          yookassaPayoutId: payout.payoutId,
          capturedAt: new Date(),
          status: "CAPTURED",
        },
      });

      break;
    }

    case "refund-seeker": {
      if (!applicationId || !amountKopecks) throw new Error("refund-seeker: missing params");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true },
      });
      if (!app?.escrowTx?.yookassaPaymentId) {
        console.log(`[paymentWorker] refund-seeker: no payment for ${applicationId}`);
        return;
      }

      const res = await refundEscrowOrThrow({
        idempotencyKey,
        escrow: {
          yookassaPaymentId: app.escrowTx.yookassaPaymentId,
          yookassaDealId: app.escrowTx.yookassaDealId,
          amountKopecks: app.escrowTx.amountKopecks,
          netPayoutKopecks: app.escrowTx.netPayoutKopecks,
        },
        description: `Возврат по заявке ${applicationId}`,
      });

      await prisma.escrowTransaction.update({
        where: { id: app.escrowTx.id },
        data: { status: "REFUNDED", refundedAt: new Date(), yookassaRefundId: res.refundId },
      });
      break;
    }

    case "refund-paid-token": {
      if (!tokenId) throw new Error("refund-paid-token: missing tokenId");
      const tok = await prisma.paidApplicationToken.findUnique({ where: { id: tokenId } });
      if (!tok?.yookassaPaymentId || tok.refundedAt) return;

      await paymentProvider.refundPayment({
        idempotencyKey,
        paymentId: tok.yookassaPaymentId,
        amountKopecks: tok.amountKopecks,
        description: `Возврат токена запроса ${tokenId}`,
      });

      await prisma.paidApplicationToken.update({
        where: { id: tokenId },
        data: { refundedAt: new Date() },
      });
      break;
    }

    case "registration-payment-check": {
      if (!job.data.userId || !job.data.yookassaPaymentId) {
        throw new Error("registration-payment-check: missing params");
      }

      const status = await paymentProvider.getPaymentStatus(job.data.yookassaPaymentId);
      if (status === "succeeded") {
        await prisma.gitHubProfile.update({
          where: { userId: job.data.userId },
          data: { paidRegistration: true },
        });
        await prisma.registrationPayment.updateMany({
          where: {
            userId: job.data.userId,
            yookassaPaymentId: job.data.yookassaPaymentId,
          },
          data: { paidAt: new Date() },
        });
      }
      break;
    }

    case "subscription-renewal": {
      const userId = job.data.userId;
      const periodEndMs = job.data.periodEndMs;
      if (!userId || periodEndMs === undefined) {
        throw new Error("subscription-renewal: missing params");
      }

      const sub = await prisma.seekerSubscription.findUnique({ where: { userId } });
      if (!sub || sub.status === "CANCELLED") return;
      if (sub.status !== "ACTIVE") return;

      const tol = BUSINESS_RULES.SUBSCRIPTION_RENEWAL_ANCHOR_TOLERANCE_MS;
      if (Math.abs(sub.currentPeriodEnd.getTime() - periodEndMs) > tol) {
        console.log(`[paymentWorker] subscription-renewal: stale anchor for ${userId}`);
        return;
      }

      const pm = sub.yookassaPaymentMethodId?.trim();
      if (!pm) {
        await prisma.seekerSubscription.update({
          where: { userId },
          data: { status: "PAST_DUE" },
        });
        await scheduleSubscriptionRenewRetry(userId, 1);
        return;
      }

      try {
        const chargeKey = randomUuid();
        const result = await paymentProvider.createPaymentWithSavedMethod({
          idempotencyKey: chargeKey,
          amountKopecks: BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP,
          description: "Продление Referi PRO на 1 месяц",
          metadata: { userId, type: "subscription_renewal" },
          paymentMethodId: pm,
        });

        if (env.FEATURE_REAL_PAYMENTS !== "true") {
          const st = await paymentProvider.getPaymentStatus(result.paymentId);
          if (st === "succeeded") {
            const { applySubscriptionRenewalSucceeded } =
              await import("@/server/services/yookassaWebhookHandlers");
            await applySubscriptionRenewalSucceeded(userId, result.paymentId, pm);
          }
        }
      } catch (err) {
        console.error("[paymentWorker] subscription-renewal charge failed", err);
        await prisma.seekerSubscription.update({
          where: { userId },
          data: { status: "PAST_DUE" },
        });
        await scheduleSubscriptionRenewRetry(userId, 1);
      }
      break;
    }

    case "subscription-renew-retry": {
      const userId = job.data.userId;
      const attempt = job.data.attempt ?? 1;
      if (!userId) throw new Error("subscription-renew-retry: missing userId");

      const sub = await prisma.seekerSubscription.findUnique({ where: { userId } });
      if (!sub || sub.status === "CANCELLED") return;
      if (sub.status === "ACTIVE" && sub.currentPeriodEnd.getTime() > Date.now()) {
        return;
      }

      const pm = sub.yookassaPaymentMethodId?.trim();
      if (!pm) {
        if (attempt < BUSINESS_RULES.SUBSCRIPTION_RETRY_MAX_ATTEMPTS) {
          await scheduleSubscriptionRenewRetry(userId, attempt + 1);
        }
        return;
      }

      try {
        const chargeKey = randomUuid();
        const result = await paymentProvider.createPaymentWithSavedMethod({
          idempotencyKey: chargeKey,
          amountKopecks: BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP,
          description: "Продление Referi PRO на 1 месяц",
          metadata: { userId, type: "subscription_renewal" },
          paymentMethodId: pm,
        });

        if (env.FEATURE_REAL_PAYMENTS !== "true") {
          const st = await paymentProvider.getPaymentStatus(result.paymentId);
          if (st === "succeeded") {
            const { applySubscriptionRenewalSucceeded } =
              await import("@/server/services/yookassaWebhookHandlers");
            await applySubscriptionRenewalSucceeded(userId, result.paymentId, pm);
          }
        }
      } catch (err) {
        console.error("[paymentWorker] subscription-renew-retry charge failed", err);
        if (attempt < BUSINESS_RULES.SUBSCRIPTION_RETRY_MAX_ATTEMPTS) {
          await scheduleSubscriptionRenewRetry(userId, attempt + 1);
        }
      }
      break;
    }

    default:
      console.warn(`[paymentWorker] unknown job type: ${type}`);
  }
}

export function startPaymentWorker() {
  return new Worker<PaymentJobData>("payments", processJob, {
    connection: redis,
    concurrency: 5,
  });
}
