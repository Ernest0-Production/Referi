import type { Prisma, PrismaClient } from "@prisma/client";
import { createApplicationRepository } from "@/server/repositories/applicationRepository";
import { scheduleReactionSLA } from "@/server/workers/slaWorker";

export class BusinessError extends Error {
  constructor(
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "BusinessError";
  }
}

interface SubmitApplicationInput {
  seekerId: string;
  vacancyId: string;
  contactInfo: string;
  bio: string;
  coverLetter?: string;
  paidTokenId?: string;
}

export async function submitApplication(db: PrismaClient, input: SubmitApplicationInput) {
  const appRepo = createApplicationRepository(db);

  // Guard G1: seeker must be authenticated — handled by tRPC middleware
  // Guard G2: active application limit
  const activeCount = await appRepo.countActiveBySeeker(input.seekerId);
  const limit = await appRepo.getActiveLimitForSeeker(input.seekerId);

  const hasPaidToken = !!input.paidTokenId;
  if (!hasPaidToken && activeCount >= limit) {
    throw new BusinessError(
      "ACTIVE_APPLICATION_LIMIT_REACHED",
      `Active applications: ${activeCount}/${limit}`,
    );
  }

  // Guard G3: no existing active application for this vacancy
  const existing = await appRepo.findActiveBySeekerAndVacancy(input.seekerId, input.vacancyId);
  if (existing) {
    throw new BusinessError("DUPLICATE_APPLICATION");
  }

  // Guard G3: vacancy must be ACTIVE
  const vacancy = await db.vacancy.findUnique({
    where: { id: input.vacancyId },
  });
  if (!vacancy || vacancy.status !== "ACTIVE") {
    throw new BusinessError("VACANCY_NOT_ACTIVE");
  }

  const isFirstApplicationOnVacancy = !vacancy.firstApplicationAt;

  const application = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.paidTokenId) {
      const token = await tx.paidApplicationToken.findUnique({
        where: { id: input.paidTokenId },
      });
      if (!token || token.seekerId !== input.seekerId) {
        throw new BusinessError("PAID_TOKEN_INVALID");
      }
      if (token.vacancyId !== input.vacancyId) {
        throw new BusinessError("PAID_TOKEN_WRONG_VACANCY");
      }
      if (token.usedAt) {
        throw new BusinessError("PAID_TOKEN_ALREADY_USED");
      }
      if (token.expiresAt < new Date()) {
        throw new BusinessError("PAID_TOKEN_EXPIRED");
      }
      if (!token.paidAt) {
        throw new BusinessError("PAID_TOKEN_NOT_PAID");
      }

      await tx.paidApplicationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
    }

    // Create application + content
    const app = await tx.application.create({
      data: {
        seekerId: input.seekerId,
        vacancyId: input.vacancyId,
        status: "SUBMITTED",
        paidApplicationTokenId: input.paidTokenId,
        content: {
          create: {
            contactInfo: input.contactInfo,
            bio: input.bio,
            coverLetter: input.coverLetter,
          },
        },
      },
    });

    // Set firstApplicationAt on vacancy if not set
    if (!vacancy.firstApplicationAt) {
      await tx.vacancy.update({
        where: { id: input.vacancyId },
        data: { firstApplicationAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        applicationId: app.id,
        toStatus: "SUBMITTED",
        actor: "SEEKER",
        actorId: input.seekerId,
      },
    });

    return app;
  });

  if (isFirstApplicationOnVacancy) {
    void scheduleReactionSLA(input.vacancyId);
  }

  return application;
}
