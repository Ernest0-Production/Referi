import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { createReferrerAttemptRepository } from "@/server/repositories/referrerAttemptRepository";
import type { Prisma } from "@prisma/client";

const specialtyEnum = z.enum([
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
  "OTHER",
]);
const gradeEnum = z.enum(["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"]);
const workFormatEnum = z.enum(["OFFICE", "HYBRID", "REMOTE"]);

const createVacancySchema = z.object({
  title: z.string().min(3).max(200),
  companyName: z.string().min(2).max(200),
  specialty: specialtyEnum,
  grade: gradeEnum,
  workFormat: workFormatEnum,
  salaryFrom: z.number().int().positive().optional(),
  salaryTo: z.number().int().positive().optional(),
  description: z.string().min(10).max(3000),
  rewardKopecks: z.number().int().min(0).default(0),
});

const vacancyListSchema = z.object({
  specialty: z.array(specialtyEnum).optional(),
  grade: z.array(gradeEnum).optional(),
  workFormat: z.array(workFormatEnum).optional(),
  salaryFrom: z.number().int().positive().optional(),
  salaryTo: z.number().int().positive().optional(),
  query: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

function serializeVacancy<
  T extends {
    salaryFromKopecks?: bigint | null;
    salaryToKopecks?: bigint | null;
    rewardKopecks: bigint;
  },
>(v: T) {
  return {
    ...v,
    salaryFromKopecks: v.salaryFromKopecks?.toString() ?? null,
    salaryToKopecks: v.salaryToKopecks?.toString() ?? null,
    rewardKopecks: v.rewardKopecks.toString(),
  };
}

export const vacanciesRouter = router({
  list: publicProcedure
    .input(vacancyListSchema)
    .query(async ({ ctx, input }) => {
      const {
        specialty,
        grade,
        workFormat,
        salaryFrom,
        salaryTo,
        query,
        page,
        limit,
      } = input;

      const where: Prisma.VacancyWhereInput = {
        status: "ACTIVE",
        ...(specialty?.length && { specialty: { in: specialty } }),
        ...(grade?.length && { grade: { in: grade } }),
        ...(workFormat?.length && { workFormat: { in: workFormat } }),
        ...(salaryFrom && {
          salaryToKopecks: { gte: BigInt(salaryFrom * 100) },
        }),
        ...(salaryTo && { salaryFromKopecks: { lte: BigInt(salaryTo * 100) } }),
        ...(query && {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { companyName: { contains: query, mode: "insensitive" } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.vacancy.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            title: true,
            companyName: true,
            specialty: true,
            grade: true,
            workFormat: true,
            salaryFromKopecks: true,
            salaryToKopecks: true,
            rewardKopecks: true,
            description: true,
            createdAt: true,
          },
        }),
        ctx.db.vacancy.count({ where }),
      ]);

      return {
        items: items.map(serializeVacancy),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vacancy = await ctx.db.vacancy.findFirst({
        where: { id: input.id, status: "ACTIVE" },
        select: {
          id: true,
          title: true,
          companyName: true,
          specialty: true,
          grade: true,
          workFormat: true,
          salaryFromKopecks: true,
          salaryToKopecks: true,
          rewardKopecks: true,
          description: true,
          createdAt: true,
        },
      });

      if (!vacancy) throw new TRPCError({ code: "NOT_FOUND" });

      return serializeVacancy(vacancy);
    }),

  create: protectedProcedure
    .input(createVacancySchema)
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      // Guard: referrer must have REFERRER role
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { roles: true },
      });
      if (!user?.roles.includes("REFERRER")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only users with REFERRER role can create vacancies",
        });
      }

      // Guard: no more than 1 active vacancy
      const existing = await ctx.db.vacancy.findFirst({
        where: { referrerId: userId, status: { in: ["ACTIVE", "FROZEN"] } },
      });
      if (existing) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ACTIVE_VACANCY_EXISTS",
        });
      }

      // Guard: must have available attempts
      const attemptRepo = createReferrerAttemptRepository(ctx.db);
      const attempts = await attemptRepo.getAvailableAttempts(userId);
      if (attempts === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "NO_ATTEMPTS_LEFT",
        });
      }

      const vacancy = await ctx.db.vacancy.create({
        data: {
          referrerId: userId,
          title: input.title,
          companyName: input.companyName,
          specialty: input.specialty,
          grade: input.grade,
          workFormat: input.workFormat,
          salaryFromKopecks: input.salaryFrom
            ? BigInt(input.salaryFrom * 100)
            : null,
          salaryToKopecks: input.salaryTo ? BigInt(input.salaryTo * 100) : null,
          description: input.description,
          rewardKopecks: BigInt(input.rewardKopecks),
        },
      });

      return serializeVacancy(vacancy);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx;

      const vacancy = await ctx.db.vacancy.findUnique({
        where: { id: input.id },
        include: {
          applications: {
            where: {
              status: {
                in: [
                  "SUBMITTED",
                  "AWAITING_PAYMENT",
                  "AWAITING_RESUME_HANDOFF",
                  "SEEKER_CANCEL_REQUESTED",
                  "AWAITING_COMPANY_DECISION",
                ],
              },
            },
            include: { escrowTx: true },
          },
        },
      });

      if (!vacancy) throw new TRPCError({ code: "NOT_FOUND" });
      if (vacancy.referrerId !== userId)
        throw new TRPCError({ code: "FORBIDDEN" });

      // Guard: cannot delete if there is an open dispute
      const hasOpenDispute = await ctx.db.application.findFirst({
        where: { vacancyId: input.id, status: "DISPUTED" },
      });
      if (hasOpenDispute) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "VACANCY_HAS_OPEN_DISPUTE",
        });
      }

      const attemptRepo = createReferrerAttemptRepository(ctx.db);

      // Cascade: cancel all active applications, return attempts, trigger refunds
      await ctx.db.$transaction(async (tx) => {
        for (const app of vacancy.applications) {
          await tx.application.update({
            where: { id: app.id },
            data: { status: "REFUNDED_BY_VACANCY_DELETED" },
          });
          await tx.auditLog.create({
            data: {
              applicationId: app.id,
              fromStatus: app.status,
              toStatus: "REFUNDED_BY_VACANCY_DELETED",
              actor: "SYSTEM",
              metadata: { reason: "vacancy_deleted_by_referrer" },
            },
          });
          // TODO Phase 4: trigger actual refund via PaymentProvider if escrowTx exists
        }

        await tx.vacancy.update({
          where: { id: input.id },
          data: { status: "DELETED", deletedAt: new Date() },
        });
      });

      // Return attempts for each active application that had consumed one
      for (const app of vacancy.applications) {
        await attemptRepo.returnAttempt(userId, app.id);
      }

      return { success: true };
    }),

  myActive: protectedProcedure.query(async ({ ctx }) => {
    const vacancy = await ctx.db.vacancy.findFirst({
      where: {
        referrerId: ctx.userId,
        status: { in: ["ACTIVE", "FROZEN"] },
      },
    });
    if (!vacancy) return null;
    return serializeVacancy(vacancy);
  }),

  applicants: protectedProcedure
    .input(z.object({ vacancyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vacancy = await ctx.db.vacancy.findUnique({
        where: { id: input.vacancyId },
      });
      if (!vacancy) throw new TRPCError({ code: "NOT_FOUND" });
      if (vacancy.referrerId !== ctx.userId)
        throw new TRPCError({ code: "FORBIDDEN" });

      const applications = await ctx.db.application.findMany({
        where: { vacancyId: input.vacancyId },
        include: {
          content: true,
          seeker: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return applications.map((app) => ({
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        seeker: app.seeker,
        // Only show contact info for active applications
        contactInfo: !["CANCELLED", "REJECTED_BY_REFERRER"].includes(app.status)
          ? app.content?.contactInfo
          : undefined,
        bio: app.content?.bio,
        coverLetter: app.content?.coverLetter,
      }));
    }),
});
