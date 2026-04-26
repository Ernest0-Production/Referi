import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { cancelSLAJob, scheduleResumeHandoffSLA } from "@/server/workers/slaWorker";

/**
 * Hold succeeded (payment.waiting_for_capture): advance application to resume handoff.
 * Used by the YooKassa HTTP webhook and by the dev mock flow.
 */
export async function applyEscrowPaymentHeld(yookassaPaymentId: string): Promise<void> {
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
