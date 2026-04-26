import type { Prisma, PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { BusinessError } from "./submitApplication";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { cancelSLAJob, scheduleCompanyDecisionSLA } from "@/server/workers/slaWorker";

export async function confirmResumeHandoff(
  db: PrismaClient,
  applicationId: string,
  referrerId: string,
) {
  const appRepo = createApplicationRepository(db);
  const application = await appRepo.findByIdForUpdate(applicationId);

  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");
  if (application.vacancy.referrerId !== referrerId) throw new BusinessError("FORBIDDEN");
  if (application.status !== "AWAITING_RESUME_HANDOFF")
    throw new BusinessError("APPLICATION_WRONG_STATUS");

  const companyDecisionDeadline = new Date(Date.now() + BUSINESS_RULES.SLA_COMPANY_DECISION_MS);

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: "AWAITING_COMPANY_DECISION",
        resumeHandoffDeadline: null,
        companyDecisionDeadline,
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_RESUME_HANDOFF",
        toStatus: "AWAITING_COMPANY_DECISION",
        actor: "REFERRER",
        actorId: referrerId,
      },
    });
  });

  void cancelSLAJob(`resume-handoff-sla:${applicationId}`);
  void scheduleCompanyDecisionSLA(applicationId);

  return {
    status: "AWAITING_COMPANY_DECISION" as const,
    companyDecisionDeadline,
  };
}
