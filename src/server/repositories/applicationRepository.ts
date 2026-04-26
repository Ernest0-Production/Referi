import type { PrismaClient, ApplicationStatus } from "@prisma/client";
import { ACTIVE_STATUSES, REFERRER_ACTIVE_REVIEW_STATUSES } from "@/shared/types/applicationStatus";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

export function createApplicationRepository(db: PrismaClient) {
  async function findByIdForUpdate(id: string) {
    return db.application.findUnique({
      where: { id },
      include: {
        vacancy: {
          select: { referrerId: true, rewardKopecks: true, id: true, title: true },
        },
        content: true,
        escrowTx: true,
      },
    });
  }

  async function updateStatus(id: string, status: ApplicationStatus) {
    return db.application.update({ where: { id }, data: { status } });
  }

  async function countActiveBySeeker(seekerId: string): Promise<number> {
    return db.application.count({
      where: { seekerId, status: { in: ACTIVE_STATUSES } },
    });
  }

  async function getActiveLimitForSeeker(seekerId: string): Promise<number> {
    const subscription = await db.seekerSubscription.findUnique({
      where: { userId: seekerId },
    });
    if (subscription?.status === "ACTIVE") {
      return BUSINESS_RULES.PRO_ACTIVE_APPLICATIONS;
    }
    return BUSINESS_RULES.FREE_ACTIVE_APPLICATIONS;
  }

  async function countActiveReviewsByReferrer(referrerId: string): Promise<number> {
    return db.application.count({
      where: {
        vacancy: { referrerId },
        status: { in: REFERRER_ACTIVE_REVIEW_STATUSES },
      },
    });
  }

  async function findActiveBySeekerAndVacancy(seekerId: string, vacancyId: string) {
    return db.application.findFirst({
      where: {
        seekerId,
        vacancyId,
        status: { in: ACTIVE_STATUSES },
      },
    });
  }

  return {
    findByIdForUpdate,
    updateStatus,
    countActiveBySeeker,
    getActiveLimitForSeeker,
    countActiveReviewsByReferrer,
    findActiveBySeekerAndVacancy,
  };
}

export type ApplicationRepository = ReturnType<typeof createApplicationRepository>;
