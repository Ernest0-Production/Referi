import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { cancelSLAJob, scheduleResumeHandoffSLA } from "@/server/workers/slaWorker";

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
  paymentMethodId?: string | null,
): Promise<void> {
  const periodMs = 30 * 24 * 60 * 60 * 1000;
  const start = new Date();
  const end = new Date(Date.now() + periodMs);

  await prisma.seekerSubscription.upsert({
    where: { userId },
    create: {
      userId,
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      yookassaPaymentMethodId: paymentMethodId ?? undefined,
    },
    update: {
      status: "ACTIVE",
      currentPeriodStart: start,
      currentPeriodEnd: end,
      ...(paymentMethodId ? { yookassaPaymentMethodId: paymentMethodId } : {}),
    },
  });
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
