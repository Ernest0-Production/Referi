import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import type { Prisma } from "@prisma/client";

import { submitApplication, BusinessError } from "@/server/commands/submitApplication";
import { confirmReferralIntent } from "@/server/commands/confirmReferralIntent";
import { confirmResumeHandoff } from "@/server/commands/confirmResumeHandoff";
import { acceptOffer } from "@/server/commands/acceptOffer";
import { seekerRequestCancel } from "@/server/commands/seekerRequestCancel";
import { ACTIVE_STATUSES } from "@/shared/types/applicationStatus";
import { cancelSLAJob } from "@/server/workers/slaWorker";
import { scheduleRefundSeeker } from "@/server/workers/paymentWorker";

function handleBusinessError(err: unknown): never {
  if (err instanceof BusinessError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: err.code,
    });
  }
  throw err;
}

export const applicationsRouter = router({
  submit: protectedProcedure
    .input(
      z.object({
        vacancyId: z.string().uuid(),
        contactInfo: z.string().min(1).max(500),
        bio: z.string().min(10).max(1000),
        coverLetter: z.string().max(300).optional(),
        paidTokenId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitApplication(ctx.db, {
          seekerId: ctx.userId,
          ...input,
        });
      } catch (err) {
        handleBusinessError(err);
      }
    }),

  cancel: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.seekerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (!["SUBMITTED", "AWAITING_PAYMENT"].includes(app.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: input.applicationId },
          data: { status: "CANCELLED" },
        });
        await tx.auditLog.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: app.status,
            toStatus: "CANCELLED",
            actor: "SEEKER",
            actorId: ctx.userId,
          },
        });
      });

      return { status: "CANCELLED" as const };
    }),

  requestCancel: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await seekerRequestCancel(ctx.db, input.applicationId, ctx.userId);
      } catch (err) {
        handleBusinessError(err);
      }
    }),

  confirmIntent: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmReferralIntent(ctx.db, input.applicationId, ctx.userId);
      } catch (err) {
        handleBusinessError(err);
      }
    }),

  reject: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { vacancy: { select: { referrerId: true } } },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.vacancy.referrerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "SUBMITTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: input.applicationId },
          data: { status: "REJECTED_BY_REFERRER" },
        });
        await tx.auditLog.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: "SUBMITTED",
            toStatus: "REJECTED_BY_REFERRER",
            actor: "REFERRER",
            actorId: ctx.userId,
          },
        });
      });

      return { status: "REJECTED_BY_REFERRER" as const };
    }),

  confirmHandoff: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmResumeHandoff(ctx.db, input.applicationId, ctx.userId);
      } catch (err) {
        handleBusinessError(err);
      }
    }),

  acknowledgeCancel: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          vacancy: { select: { referrerId: true } },
          escrowTx: true,
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.vacancy.referrerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "SEEKER_CANCEL_REQUESTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: input.applicationId },
          data: { status: "REFUNDED_BY_CANCEL_ACK", cancelAckDeadline: null },
        });
        await tx.auditLog.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: "SEEKER_CANCEL_REQUESTED",
            toStatus: "REFUNDED_BY_CANCEL_ACK",
            actor: "REFERRER",
            actorId: ctx.userId,
          },
        });
      });

      void cancelSLAJob(`cancel-ack-sla:${input.applicationId}`);
      if (app.escrowTx?.yookassaPaymentId) {
        void scheduleRefundSeeker(
          input.applicationId,
          app.escrowTx.amountKopecks,
          `refund-cancel-ack:${input.applicationId}`,
        );
      }

      return { status: "REFUNDED_BY_CANCEL_ACK" as const };
    }),

  acceptOffer: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptOffer(ctx.db, input.applicationId, ctx.userId);
      } catch (err) {
        handleBusinessError(err);
      }
    }),

  reportRejection: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.seekerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "AWAITING_COMPANY_DECISION") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      // Mark seeker's rejection claim; wait for referrer to confirm/deny
      await ctx.db.auditLog.create({
        data: {
          applicationId: input.applicationId,
          fromStatus: "AWAITING_COMPANY_DECISION",
          toStatus: "AWAITING_COMPANY_DECISION",
          actor: "SEEKER",
          actorId: ctx.userId,
          metadata: { event: "seeker_reported_rejection" },
        },
      });

      return { reported: true };
    }),

  confirmRejection: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          vacancy: { select: { referrerId: true } },
          escrowTx: true,
        },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.vacancy.referrerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "AWAITING_COMPANY_DECISION") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: input.applicationId },
          data: {
            status: "REJECTED_BY_COMPANY",
            companyDecisionDeadline: null,
          },
        });
        await tx.auditLog.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: "AWAITING_COMPANY_DECISION",
            toStatus: "REJECTED_BY_COMPANY",
            actor: "REFERRER",
            actorId: ctx.userId,
          },
        });
      });

      void cancelSLAJob(`company-decision-sla:${input.applicationId}`);
      if (app.escrowTx?.yookassaPaymentId) {
        void scheduleRefundSeeker(
          input.applicationId,
          app.escrowTx.amountKopecks,
          `refund-rejected-company:${input.applicationId}`,
        );
      }

      return { status: "REJECTED_BY_COMPANY" as const };
    }),

  denyRejection: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { vacancy: { select: { referrerId: true } } },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.vacancy.referrerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "AWAITING_COMPANY_DECISION") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: input.applicationId },
          data: { status: "DISPUTED", companyDecisionDeadline: null },
        });
        await tx.moderatorCase.create({
          data: { applicationId: input.applicationId },
        });
        await tx.auditLog.create({
          data: {
            applicationId: input.applicationId,
            fromStatus: "AWAITING_COMPANY_DECISION",
            toStatus: "DISPUTED",
            actor: "REFERRER",
            actorId: ctx.userId,
          },
        });
      });

      void cancelSLAJob(`company-decision-sla:${input.applicationId}`);

      return { status: "DISPUTED" as const };
    }),

  myList: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const applications = await ctx.db.application.findMany({
        where: {
          seekerId: ctx.userId,
          ...(input.status && { status: input.status as never }),
        },
        include: {
          vacancy: {
            select: {
              id: true,
              title: true,
              companyName: true,
              specialty: true,
              grade: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return applications;
    }),

  getById: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          content: true,
          vacancy: {
            select: {
              id: true,
              title: true,
              companyName: true,
              referrerId: true,
              rewardKopecks: true,
            },
          },
          auditLogs: { orderBy: { createdAt: "asc" } },
        },
      });

      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const isSeeker = app.seekerId === ctx.userId;
      const isReferrer = app.vacancy.referrerId === ctx.userId;

      if (!isSeeker && !isReferrer) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Referrers see contact info only for active applications
      const isActiveStatus = ACTIVE_STATUSES.includes(app.status);
      const showContactInfo = isReferrer && isActiveStatus;

      return {
        id: app.id,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        paymentDeadline: app.paymentDeadline,
        resumeHandoffDeadline: app.resumeHandoffDeadline,
        cancelAckDeadline: app.cancelAckDeadline,
        companyDecisionDeadline: app.companyDecisionDeadline,
        vacancy: {
          ...app.vacancy,
          rewardKopecks: app.vacancy.rewardKopecks.toString(),
          // Never expose referrerId to seekers
          referrerId: isReferrer ? app.vacancy.referrerId : undefined,
        },
        content: isSeeker
          ? app.content
          : {
              contactInfo: showContactInfo ? app.content?.contactInfo : undefined,
              bio: app.content?.bio,
              coverLetter: app.content?.coverLetter,
            },
        auditLogs: isReferrer || isSeeker ? app.auditLogs : [],
      };
    }),

  getAuditLog: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { vacancy: { select: { referrerId: true } } },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const isSeeker = app.seekerId === ctx.userId;
      const isReferrer = app.vacancy.referrerId === ctx.userId;

      const viewer = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { roles: true },
      });
      const isModerator = Boolean(
        viewer && (viewer.roles.includes("MODERATOR") || viewer.roles.includes("ADMIN")),
      );

      if (!isSeeker && !isReferrer && !isModerator) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db.auditLog.findMany({
        where: { applicationId: input.applicationId },
        orderBy: { createdAt: "asc" },
      });
    }),
});
