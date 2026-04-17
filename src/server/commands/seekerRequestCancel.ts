import type { PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { BusinessError } from "./submitApplication";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

export async function seekerRequestCancel(
  db: PrismaClient,
  applicationId: string,
  seekerId: string,
) {
  const appRepo = createApplicationRepository(db);
  const application = await appRepo.findByIdForUpdate(applicationId);

  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");
  if (application.seekerId !== seekerId) throw new BusinessError("FORBIDDEN");
  if (application.status !== "AWAITING_RESUME_HANDOFF")
    throw new BusinessError("APPLICATION_WRONG_STATUS");

  const cancelAckDeadline = new Date(
    Date.now() + BUSINESS_RULES.SLA_CANCEL_ACK_MS,
  );

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "SEEKER_CANCEL_REQUESTED",
        cancelAckDeadline,
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_RESUME_HANDOFF",
        toStatus: "SEEKER_CANCEL_REQUESTED",
        actor: "SEEKER",
        actorId: seekerId,
      },
    });
  });

  // TODO Phase 6: notify referrer via Telegram/email

  return { status: "SEEKER_CANCEL_REQUESTED" as const, cancelAckDeadline };
}
