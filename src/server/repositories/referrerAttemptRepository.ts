import type { PrismaClient } from "@prisma/client";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

export function createReferrerAttemptRepository(db: PrismaClient) {
  async function getAvailableAttempts(referrerId: string): Promise<number> {
    const now = new Date();
    // Active consumed attempts: CONSUMED with regeneratesAt in the future
    const activeConsumed = await db.referrerAttemptLedger.count({
      where: {
        referrerId,
        event: "CONSUMED",
        regeneratesAt: { gt: now },
      },
    });
    return Math.max(0, BUSINESS_RULES.MAX_REFERRER_ATTEMPTS - activeConsumed);
  }

  async function consume(
    referrerId: string,
    applicationId: string,
  ): Promise<{ ledgerEntryId: string; regeneratesAt: Date }> {
    const regeneratesAt = new Date(
      Date.now() + BUSINESS_RULES.ATTEMPT_REGENERATION_MS,
    );
    const entry = await db.referrerAttemptLedger.create({
      data: {
        referrerId,
        event: "CONSUMED",
        applicationId,
        regeneratesAt,
      },
    });
    return { ledgerEntryId: entry.id, regeneratesAt };
  }

  async function returnAttempt(
    referrerId: string,
    applicationId: string,
  ): Promise<void> {
    // Find the CONSUMED entry for this application and mark it as returned
    // by creating a RETURNED entry (and updating the CONSUMED entry's regeneratesAt to past)
    const consumed = await db.referrerAttemptLedger.findFirst({
      where: { referrerId, applicationId, event: "CONSUMED" },
    });
    if (!consumed) return;

    await db.$transaction([
      db.referrerAttemptLedger.update({
        where: { id: consumed.id },
        data: { regeneratesAt: new Date(0) }, // past date = no longer active
      }),
      db.referrerAttemptLedger.create({
        data: {
          referrerId,
          event: "RETURNED",
          applicationId,
        },
      }),
    ]);
  }

  async function regenerate(
    referrerId: string,
    applicationId: string,
  ): Promise<void> {
    await db.referrerAttemptLedger.create({
      data: {
        referrerId,
        event: "REGENERATED",
        applicationId,
      },
    });
  }

  return { getAvailableAttempts, consume, returnAttempt, regenerate };
}

export type ReferrerAttemptRepository = ReturnType<
  typeof createReferrerAttemptRepository
>;
