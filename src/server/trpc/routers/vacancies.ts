import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { createReferrerAttemptRepository } from "@/server/repositories/referrerAttemptRepository";
import { cancelSLAJob } from "@/server/workers/slaWorker";
import { scheduleRefundSeeker, scheduleRefundPaidToken } from "@/server/workers/paymentWorker";
import { Prisma } from "@prisma/client";
import { VACANCY_SALARY_CURRENCY_VALUES } from "@/lib/vacancySalaryCurrency";

const specialtyEnum = z.enum([
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "IOS_MOBILE",
  "ANDROID_MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
]);
const gradeEnum = z.enum(["JUNIOR", "MIDDLE", "SENIOR", "LEAD"]);
const workFormatEnum = z.enum(["OFFICE", "HYBRID", "REMOTE"]);
const salaryCurrencyEnum = z.enum(VACANCY_SALARY_CURRENCY_VALUES);

/** Максимум компенсации реферальщику: 100 000 ₽; шаг 10 000 ₽ → копейки кратны 1 000 000. */
const REFERRER_BONUS_MAX_KOPECKS = 10_000_000;
const REFERRER_BONUS_STEP_KOPECKS = 1_000_000;

const vacancyWriteSchema = z
  .object({
    title: z.string().min(3).max(200),
    companyName: z.string().min(2).max(200),
    specialty: specialtyEnum,
    grade: gradeEnum,
    workFormat: workFormatEnum,
    salaryCurrency: salaryCurrencyEnum.default("RUB"),
    salaryFrom: z.number().int().min(0).optional(),
    salaryTo: z.number().int().min(0).optional(),
    description: z.string().min(10).max(1000),
    rewardKopecks: z.number().int().min(0).max(REFERRER_BONUS_MAX_KOPECKS).default(0),
  })
  .refine((d) => d.salaryFrom == null || d.salaryTo == null || d.salaryFrom < d.salaryTo, {
    message: "Минимальная зарплата не может быть меньше максимальной",
    path: ["salaryTo"],
  })
  .refine((d) => d.rewardKopecks % REFERRER_BONUS_STEP_KOPECKS === 0, {
    message: "Компенсация реферальщику должна быть от 0 до 100 000 ₽ с шагом 10 000 ₽.",
    path: ["rewardKopecks"],
  });

const createVacancySchema = vacancyWriteSchema;

const updateVacancySchema = z.object({ id: z.string().uuid() }).merge(vacancyWriteSchema);

const vacancyListSchema = z.object({
  specialty: z.array(specialtyEnum).optional(),
  grade: z.array(gradeEnum).optional(),
  workFormat: z.array(workFormatEnum).optional(),
  salaryCurrency: salaryCurrencyEnum.optional(),
  salaryFrom: z.number().int().positive().optional(),
  query: z.string().max(200).optional(),
  sort: z.enum(["created_desc", "salary_desc"]).default("created_desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(20),
});

function serializeVacancy<
  T extends {
    salaryCurrency: "RUB" | "USD" | "EUR";
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

function vacancyWithApplicationCount<
  T extends {
    salaryCurrency: "RUB" | "USD" | "EUR";
    salaryFromKopecks?: bigint | null;
    salaryToKopecks?: bigint | null;
    rewardKopecks: bigint;
    _count: { applications: number };
  },
>(row: T) {
  const { _count, ...rest } = row;
  return {
    ...serializeVacancy(rest),
    applicationCount: _count.applications,
  };
}

export const vacanciesRouter = router({
  list: publicProcedure.input(vacancyListSchema).query(async ({ ctx, input }) => {
    const { specialty, grade, workFormat, salaryCurrency, salaryFrom, query, sort, page, limit } =
      input;
    const q = query?.trim();
    let ftsIds: string[] | undefined;

    if (q) {
      const rows = await ctx.db.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT "id" FROM "vacancies"
          WHERE "status" = 'ACTIVE'::"VacancyStatus"
            AND to_tsvector(
              'russian',
              coalesce("title",'') || ' ' || coalesce("description",'') || ' ' || coalesce("companyName",'')
            ) @@ plainto_tsquery('russian', ${q})
        `,
      );
      ftsIds = rows.map((row) => row.id);
      if (ftsIds.length === 0) {
        return { items: [], total: 0, page, totalPages: 0 };
      }
    }

    const idFilter: { in?: string[] } = {};
    if (ftsIds?.length) idFilter.in = ftsIds;

    const effectiveSalaryCurrency = salaryFrom != null ? (salaryCurrency ?? "RUB") : salaryCurrency;

    const where: Prisma.VacancyWhereInput = {
      status: "ACTIVE",
      ...(Object.keys(idFilter).length > 0 && { id: idFilter }),
      ...(specialty?.length && { specialty: { in: specialty } }),
      ...(grade?.length && { grade: { in: grade } }),
      ...(workFormat?.length && { workFormat: { in: workFormat } }),
      ...(effectiveSalaryCurrency && { salaryCurrency: effectiveSalaryCurrency }),
      ...(salaryFrom && {
        salaryToKopecks: { gte: BigInt(salaryFrom * 100) },
      }),
    };

    const orderBy: Prisma.VacancyOrderByWithRelationInput[] =
      sort === "salary_desc"
        ? [{ salaryToKopecks: "desc" }, { salaryFromKopecks: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

    const [items, total] = await Promise.all([
      ctx.db.vacancy.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          companyName: true,
          specialty: true,
          grade: true,
          workFormat: true,
          salaryCurrency: true,
          salaryFromKopecks: true,
          salaryToKopecks: true,
          rewardKopecks: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { applications: true } },
        },
      }),
      ctx.db.vacancy.count({ where }),
    ]);

    return {
      items: items.map(vacancyWithApplicationCount),
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
          referrerId: true,
          title: true,
          companyName: true,
          specialty: true,
          grade: true,
          workFormat: true,
          salaryCurrency: true,
          salaryFromKopecks: true,
          salaryToKopecks: true,
          rewardKopecks: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { applications: true } },
        },
      });

      if (!vacancy) throw new TRPCError({ code: "NOT_FOUND" });

      const isMine = ctx.session?.user?.id === vacancy.referrerId;
      const { referrerId, ...vacancyPublic } = vacancy;
      void referrerId;

      return { ...vacancyWithApplicationCount(vacancyPublic), isMine };
    }),

  create: protectedProcedure.input(createVacancySchema).mutation(async ({ ctx, input }) => {
    const { userId } = ctx;

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
        salaryCurrency: input.salaryCurrency,
        salaryFromKopecks: input.salaryFrom ? BigInt(input.salaryFrom * 100) : null,
        salaryToKopecks: input.salaryTo ? BigInt(input.salaryTo * 100) : null,
        description: input.description,
        rewardKopecks: BigInt(input.rewardKopecks),
      },
    });

    return serializeVacancy(vacancy);
  }),

  update: protectedProcedure.input(updateVacancySchema).mutation(async ({ ctx, input }) => {
    const { userId } = ctx;
    const { id, ...fields } = input;

    const existing = await ctx.db.vacancy.findUnique({ where: { id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.referrerId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
    if (!["ACTIVE", "FROZEN"].includes(existing.status)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "VACANCY_NOT_EDITABLE" });
    }

    const vacancy = await ctx.db.vacancy.update({
      where: { id },
      data: {
        title: fields.title,
        companyName: fields.companyName,
        specialty: fields.specialty,
        grade: fields.grade,
        workFormat: fields.workFormat,
        salaryCurrency: fields.salaryCurrency,
        salaryFromKopecks: fields.salaryFrom ? BigInt(fields.salaryFrom * 100) : null,
        salaryToKopecks: fields.salaryTo ? BigInt(fields.salaryTo * 100) : null,
        description: fields.description,
        rewardKopecks: BigInt(fields.rewardKopecks),
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
      if (vacancy.referrerId !== userId) throw new TRPCError({ code: "FORBIDDEN" });

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
      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
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
        }

        await tx.vacancy.update({
          where: { id: input.id },
          data: { status: "DELETED", deletedAt: new Date() },
        });
      });

      for (const app of vacancy.applications) {
        const aid = app.id;
        void cancelSLAJob(`payment-deadline:${aid}`);
        void cancelSLAJob(`resume-handoff-sla:${aid}`);
        void cancelSLAJob(`cancel-ack-sla:${aid}`);
        void cancelSLAJob(`company-decision-sla:${aid}`);
        if (app.escrowTx?.yookassaPaymentId) {
          void scheduleRefundSeeker(
            aid,
            app.escrowTx.amountKopecks,
            `refund-vacancy-deleted:${aid}`,
          );
        }
      }

      // Return attempts for each active application that had consumed one
      for (const app of vacancy.applications) {
        await attemptRepo.returnAttempt(userId, app.id);
      }

      const paidTokens = await ctx.db.paidApplicationToken.findMany({
        where: {
          vacancyId: input.id,
          usedAt: null,
          refundedAt: null,
          paidAt: { not: null },
          yookassaPaymentId: { not: null },
        },
      });
      for (const token of paidTokens) {
        void scheduleRefundPaidToken(token.id, `refund-token-vacancy-deleted:${token.id}`);
      }

      return { success: true };
    }),

  myActive: protectedProcedure.query(async ({ ctx }) => {
    const vacancy = await ctx.db.vacancy.findFirst({
      where: {
        referrerId: ctx.userId,
        status: { in: ["ACTIVE", "FROZEN"] },
      },
      select: {
        id: true,
        title: true,
        companyName: true,
        specialty: true,
        grade: true,
        workFormat: true,
        salaryCurrency: true,
        salaryFromKopecks: true,
        salaryToKopecks: true,
        rewardKopecks: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        _count: {
          select: { applications: true },
        },
      },
    });
    if (!vacancy) return null;
    return vacancyWithApplicationCount(vacancy);
  }),

  applicants: protectedProcedure
    .input(z.object({ vacancyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const vacancy = await ctx.db.vacancy.findUnique({
        where: { id: input.vacancyId },
      });
      if (!vacancy) throw new TRPCError({ code: "NOT_FOUND" });
      if (vacancy.referrerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });

      const applications = await ctx.db.application.findMany({
        where: { vacancyId: input.vacancyId, status: "SUBMITTED" },
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
        contactInfo: app.content?.contactInfo,
        bio: app.content?.bio,
        coverLetter: app.content?.coverLetter,
      }));
    }),
});
