import type { PrismaClient } from "@prisma/client";
import { BusinessError } from "@/server/commands/submitApplication";
import {
  syncEscrowFinancialsBeforeAccountDeletion,
  syncPaidTokenRefundBeforeAccountDeletion,
} from "@/server/services/accountDeletionPayments";
import {
  cancelPaymentJob,
  cancelSubscriptionPaymentJobsForUser,
} from "@/server/workers/paymentQueue";
import { cancelSLAJob } from "@/server/workers/slaWorker";
import { ru } from "@/locales";

export async function deleteAccountAndAllData(db: PrismaClient, userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, staffRoles: true },
  });

  if (!user) {
    throw new BusinessError("NOT_FOUND", "User not found");
  }

  if (user.staffRoles.length > 0) {
    throw new BusinessError(
      "ACCOUNT_DELETE_STAFF_FORBIDDEN",
      ru.server.deleteAccount.staffBlocked,
    );
  }

  const vacancies = await db.vacancy.findMany({
    where: { referrerId: userId },
    select: { id: true },
  });
  const vacancyIds = vacancies.map((v) => v.id);

  const appsAsSeeker = await db.application.findMany({
    where: { seekerId: userId },
    select: { id: true },
  });

  const appsOnVacancies =
    vacancyIds.length > 0
      ? await db.application.findMany({
          where: { vacancyId: { in: vacancyIds } },
          select: { id: true },
        })
      : [];

  const applicationIds = [
    ...new Set([...appsAsSeeker.map((a) => a.id), ...appsOnVacancies.map((a) => a.id)]),
  ];

  const ledgerRows = await db.referrerAttemptLedger.findMany({
    where: { referrerId: userId },
    select: { id: true },
  });
  const ledgerIds = ledgerRows.map((r) => r.id);

  const paidTokensToRefund = await db.paidApplicationToken.findMany({
    where: {
      seekerId: userId,
      paidAt: { not: null },
      yookassaPaymentId: { not: null },
      refundedAt: null,
      usedAt: null,
    },
    select: { id: true },
  });

  const subscription = await db.seekerSubscription.findUnique({
    where: { userId },
    select: { currentPeriodEnd: true },
  });

  for (const appId of applicationIds) {
    await cancelSLAJob(`payment-deadline:${appId}`);
    await cancelSLAJob(`resume-handoff-sla:${appId}`);
    await cancelSLAJob(`cancel-ack-sla:${appId}`);
    await cancelSLAJob(`company-decision-sla:${appId}`);
    await cancelPaymentJob(`offer-accepted:${appId}`);
    await cancelPaymentJob(`refund-seeker:${appId}`);
  }

  for (const vid of vacancyIds) {
    await cancelSLAJob(`reaction-sla:${vid}`);
    await cancelSLAJob(`vacancy-unfreeze:${vid}`);
  }

  for (const lid of ledgerIds) {
    await cancelSLAJob(`attempt-regen:${lid}`);
  }

  for (const t of paidTokensToRefund) {
    await cancelPaymentJob(`refund-paid-token:${t.id}`);
  }

  await cancelSubscriptionPaymentJobsForUser(userId);

  if (subscription) {
    await cancelPaymentJob(
      `subscription-renew:${userId}:${subscription.currentPeriodEnd.getTime()}`,
    );
  }

  for (const appId of applicationIds) {
    await syncEscrowFinancialsBeforeAccountDeletion(db, appId);
  }

  for (const t of paidTokensToRefund) {
    await syncPaidTokenRefundBeforeAccountDeletion(db, t.id);
  }

  await db.$transaction(async (tx) => {
    await tx.moderatorCase.updateMany({
      where: { moderatorId: userId },
      data: { moderatorId: null },
    });

    if (applicationIds.length > 0) {
      await tx.moderatorCase.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.auditLog.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.escrowTransaction.deleteMany({
        where: { applicationId: { in: applicationIds } },
      });
      await tx.application.deleteMany({
        where: { id: { in: applicationIds } },
      });
    }

    await tx.abuseReport.deleteMany({
      where: {
        OR: [
          { reporterId: userId },
          ...(vacancyIds.length > 0 ? [{ vacancyId: { in: vacancyIds } }] : []),
        ],
      },
    });

    await tx.vacancy.deleteMany({
      where: { referrerId: userId },
    });

    await tx.referrerAttemptLedger.deleteMany({
      where: { referrerId: userId },
    });

    await tx.referrerSanction.deleteMany({
      where: { referrerId: userId },
    });

    await tx.paidApplicationToken.deleteMany({
      where: { seekerId: userId },
    });

    await tx.registrationPayment.deleteMany({
      where: { userId },
    });

    await tx.user.delete({
      where: { id: userId },
    });
  });
}
