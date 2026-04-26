import type { Prisma, PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { BusinessError } from "./submitApplication";
import { cancelSLAJob } from "@/server/workers/slaWorker";
import { scheduleOfferAcceptedPayout } from "@/server/workers/paymentWorker";

export async function acceptOffer(db: PrismaClient, applicationId: string, seekerId: string) {
  const appRepo = createApplicationRepository(db);
  const application = await appRepo.findByIdForUpdate(applicationId);

  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");
  if (application.seekerId !== seekerId) throw new BusinessError("FORBIDDEN");
  if (application.status !== "AWAITING_COMPANY_DECISION")
    throw new BusinessError("APPLICATION_WRONG_STATUS");

  const hadEscrowPayment = Boolean(application.escrowTx?.yookassaPaymentId);

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "OFFER_ACCEPTED",
        companyDecisionDeadline: null,
      },
    });

    // Auto-delete vacancy
    await tx.vacancy.update({
      where: { id: application.vacancyId },
      data: { status: "CLOSED", deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_COMPANY_DECISION",
        toStatus: "OFFER_ACCEPTED",
        actor: "SEEKER",
        actorId: seekerId,
      },
    });
  });

  void cancelSLAJob(`company-decision-sla:${applicationId}`);
  if (hadEscrowPayment) {
    void scheduleOfferAcceptedPayout(applicationId);
  }

  return { status: "OFFER_ACCEPTED" as const };
}
