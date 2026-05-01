import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { cancelSLAJob, scheduleResumeHandoffSLA } from "@/server/workers/slaWorker";
import {
  scheduleSubscriptionRenewal,
  scheduleSubscriptionRenewRetry,
} from "@/server/workers/subscriptionRenewalScheduler";

export async function applyEscrowPaymentSucceeded(yookassaPaymentId: string): Promise<void> {
  const escrow = await prisma.escrowTransaction.findFirst({
    where: { yookassaPaymentId },
  });
  if (!escrow || escrow.status !== "HELD") return;

  const application = await prisma.application.findUnique({
    where: { id: escrow.applicationId },
  });
  if (!application || application.status !== "AWAITING_PAYMENT") return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.escrowTransaction.update({
      where: { id: escrow.id },
      data: { heldAt: new Date() },
    });
    await tx.application.update({
      where: { id: escrow.applicationId },
      data: {
        status: "AWAITING_RESUME_HANDOFF",
        paymentDeadline: null,
        resumeHandoffDeadline: new Date(Date.now() + BUSINESS_RULES.SLA_RESUME_HANDOFF_MS),
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId: escrow.applicationId,
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "AWAITING_RESUME_HANDOFF",
        actor: "SYSTEM",
        metadata: { yookassaPaymentId },
      },
    });
  });

  void cancelSLAJob(`payment-deadline:${escrow.applicationId}`);
  void scheduleResumeHandoffSLA(escrow.applicationId);
}

export async function applyRegistrationPaymentSucceeded(yookassaPaymentId: string): Promise<void> {
  const regPayment = await prisma.registrationPayment.findFirst({
    where: { yookassaPaymentId },
  });
  if (!regPayment || regPayment.paidAt) return;

  await prisma.$transaction([
    prisma.registrationPayment.update({
      where: { id: regPayment.id },
      data: { paidAt: new Date() },
    }),
    prisma.gitHubProfile.update({
      where: { userId: regPayment.userId },
      data: { paidRegistration: true },
    }),
  ]);
}

export async function applySubscriptionPaymentSucceeded(
  userId: string,
  paymentMethodId: string | null | undefined,
  yookassaPaymentId: string,
): Promise<void> {
  const dup = await prisma.subscriptionPayment.findUnique({
    where: { yookassaPaymentId },
  });
  if (dup) return;

  const periodMs = BUSINESS_RULES.SUBSCRIPTION_PERIOD_MS;
  const start = new Date();
  const end = new Date(Date.now() + periodMs);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.seekerSubscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "ACTIVE",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        yookassaPaymentMethodId:
          paymentMethodId?.trim() ||
          (process.env.FEATURE_REAL_PAYMENTS === "true" ? undefined : `mock_saved_pm:${userId}`),
      },
      update: {
        status: "ACTIVE",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        ...(paymentMethodId?.trim()
          ? { yookassaPaymentMethodId: paymentMethodId.trim() }
          : {}),
      },
    });
    await tx.subscriptionPayment.create({
      data: {
        userId,
        yookassaPaymentId,
        kind: "INITIAL",
      },
    });
  });

  await scheduleSubscriptionRenewal(userId, end);
}

export async function applySubscriptionRenewalSucceeded(
  userId: string,
  yookassaPaymentId: string,
  paymentMethodId: string | null | undefined,
): Promise<void> {
  const dup = await prisma.subscriptionPayment.findUnique({
    where: { yookassaPaymentId },
  });
  if (dup) return;

  const sub = await prisma.seekerSubscription.findUnique({
    where: { userId },
  });
  if (!sub || sub.status === "CANCELLED") return;

  const periodMs = BUSINESS_RULES.SUBSCRIPTION_PERIOD_MS;
  const now = Date.now();

  let newStart: Date;
  let newEnd: Date;
  if (sub.status === "PAST_DUE") {
    newStart = new Date();
    newEnd = new Date(now + periodMs);
  } else {
    newStart = sub.currentPeriodEnd;
    newEnd = new Date(sub.currentPeriodEnd.getTime() + periodMs);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.seekerSubscription.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        currentPeriodStart: newStart,
        currentPeriodEnd: newEnd,
        ...(paymentMethodId ? { yookassaPaymentMethodId: paymentMethodId } : {}),
      },
    });
    await tx.subscriptionPayment.create({
      data: {
        userId,
        yookassaPaymentId,
        kind: "RENEWAL",
      },
    });
  });

  await scheduleSubscriptionRenewal(userId, newEnd);
}

export async function applySubscriptionRenewalCanceled(userId: string): Promise<void> {
  const sub = await prisma.seekerSubscription.findUnique({
    where: { userId },
  });
  if (!sub || sub.status !== "ACTIVE") return;

  await prisma.seekerSubscription.update({
    where: { userId },
    data: { status: "PAST_DUE" },
  });

  await scheduleSubscriptionRenewRetry(userId, 1);
}

export async function applyPaidTokenPaymentSucceeded(yookassaPaymentId: string): Promise<void> {
  const token = await prisma.paidApplicationToken.findFirst({
    where: { yookassaPaymentId },
  });
  if (!token || token.paidAt) return;

  await prisma.paidApplicationToken.update({
    where: { id: token.id },
    data: { paidAt: new Date() },
  });
}
