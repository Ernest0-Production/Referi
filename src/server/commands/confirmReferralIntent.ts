import type { PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { createReferrerAttemptRepository } from "@/server/repositories/referrerAttemptRepository";
import { BusinessError } from "./submitApplication";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

export async function confirmReferralIntent(
  db: PrismaClient,
  applicationId: string,
  referrerId: string,
) {
  const appRepo = createApplicationRepository(db);
  const attemptRepo = createReferrerAttemptRepository(db);

  const application = await appRepo.findByIdForUpdate(applicationId);
  if (!application) throw new BusinessError("APPLICATION_NOT_FOUND");

  // Guard G4: actor is the referrer of this vacancy
  if (application.vacancy.referrerId !== referrerId) {
    throw new BusinessError("FORBIDDEN");
  }

  // Guard G7: application must be SUBMITTED
  if (application.status !== "SUBMITTED") {
    throw new BusinessError("APPLICATION_WRONG_STATUS");
  }

  // Guard G5: referrer must have available attempts
  const attempts = await attemptRepo.getAvailableAttempts(referrerId);
  if (attempts <= 0) {
    throw new BusinessError("NO_ATTEMPTS_LEFT");
  }

  // Guard G6: referrer must not have another active review
  const activeReviews = await appRepo.countActiveReviewsByReferrer(referrerId);
  if (activeReviews >= 1) {
    throw new BusinessError("ACTIVE_REVIEW_LIMIT_REACHED");
  }

  // Check if referrer is banned
  const activeBan = await db.referrerSanction.findFirst({
    where: {
      referrerId,
      sanctionType: "RESUME_HANDOFF_BAN",
      expiresAt: { gt: new Date() },
    },
  });
  if (activeBan) {
    throw new BusinessError("REFERRER_BANNED");
  }

  const paymentDeadline = new Date(
    Date.now() + BUSINESS_RULES.SLA_PAYMENT_DEADLINE_MS,
  );

  const result = await db.$transaction(async (tx) => {
    // Consume attempt
    const { ledgerEntryId, regeneratesAt } = await attemptRepo.consume(
      referrerId,
      applicationId,
    );

    // If rewardKopecks = 0, skip payment step and go directly to AWAITING_RESUME_HANDOFF
    const rewardKopecks = application.vacancy.rewardKopecks;
    const isFreeReferral = rewardKopecks === BigInt(0);

    const resumeHandoffDeadline = isFreeReferral
      ? new Date(Date.now() + BUSINESS_RULES.SLA_RESUME_HANDOFF_MS)
      : null;

    const updatedApp = await tx.application.update({
      where: { id: applicationId },
      data: {
        status: isFreeReferral ? "AWAITING_RESUME_HANDOFF" : "AWAITING_PAYMENT",
        paymentDeadline: isFreeReferral ? null : paymentDeadline,
        resumeHandoffDeadline: isFreeReferral ? resumeHandoffDeadline : null,
      },
    });

    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "SUBMITTED",
        toStatus: isFreeReferral
          ? "AWAITING_RESUME_HANDOFF"
          : "AWAITING_PAYMENT",
        actor: "REFERRER",
        actorId: referrerId,
      },
    });

    return { updatedApp, ledgerEntryId, regeneratesAt };
  });

  return result.updatedApp;
}
