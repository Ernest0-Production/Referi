import type { PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { BusinessError } from "./submitApplication";

export async function acceptOffer(
  db: PrismaClient,
  applicationId: string,
  seekerId: string,
) {
  const appRepo = createApplicationRepository(db);
  const application = await appRepo.findByIdForUpdate(applicationId);

  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");
  if (application.seekerId !== seekerId) throw new BusinessError("FORBIDDEN");
  if (application.status !== "AWAITING_COMPANY_DECISION")
    throw new BusinessError("APPLICATION_WRONG_STATUS");

  await db.$transaction(async (tx) => {
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

  // TODO Phase 4: trigger escrow capture + payout via PaymentProvider

  return { status: "OFFER_ACCEPTED" as const };
}
