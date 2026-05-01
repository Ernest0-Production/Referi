import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, moderatorProcedure, protectedProcedure } from "../trpc";
import type { Prisma } from "@prisma/client";

import { telegramService } from "@/server/services/telegramService";
import { refundEscrowOrThrow } from "@/server/services/paymentService";
import { scheduleOfferAcceptedPayout } from "@/server/workers/paymentWorker";

export const moderationRouter = router({
  openCases: moderatorProcedure.query(async ({ ctx }) => {
    return ctx.db.moderatorCase.findMany({
      where: { status: "OPEN" },
      include: {
        application: {
          include: {
            vacancy: { select: { title: true, companyName: true } },
            seeker: { select: { id: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  getCaseById: moderatorProcedure
    .input(z.object({ caseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const moderatorCase = await ctx.db.moderatorCase.findUnique({
        where: { id: input.caseId },
        include: {
          application: {
            include: {
              vacancy: true,
              content: true,
              seeker: { select: { id: true, displayName: true } },
              auditLogs: { orderBy: { createdAt: "asc" } },
              escrowTx: true,
            },
          },
        },
      });

      if (!moderatorCase) throw new TRPCError({ code: "NOT_FOUND" });
      return moderatorCase;
    }),

  resolveForReferrer: moderatorProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const moderatorCase = await ctx.db.moderatorCase.findUnique({
        where: { id: input.caseId },
        include: {
          application: { include: { escrowTx: true, vacancy: true } },
        },
      });

      if (!moderatorCase || moderatorCase.status !== "OPEN") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const app = moderatorCase.application;
      if (app.status !== "DISPUTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: app.id },
          data: { status: "OFFER_ACCEPTED" },
        });
        await tx.moderatorCase.update({
          where: { id: input.caseId },
          data: {
            status: "RESOLVED_FOR_REFERRER",
            notes: input.notes,
            resolvedAt: new Date(),
            moderatorId: ctx.userId,
          },
        });
        await tx.auditLog.create({
          data: {
            applicationId: app.id,
            fromStatus: "DISPUTED",
            toStatus: "OFFER_ACCEPTED",
            actor: "MODERATOR",
            actorId: ctx.userId,
            metadata: { caseId: input.caseId },
          },
        });
      });

      if (app.escrowTx?.yookassaPaymentId) {
        void scheduleOfferAcceptedPayout(app.id);
      }

      return { status: "RESOLVED_FOR_REFERRER" as const };
    }),

  resolveForSeeker: moderatorProcedure
    .input(
      z.object({
        caseId: z.string().uuid(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const moderatorCase = await ctx.db.moderatorCase.findUnique({
        where: { id: input.caseId },
        include: { application: { include: { escrowTx: true } } },
      });

      if (!moderatorCase || moderatorCase.status !== "OPEN") {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const app = moderatorCase.application;
      if (app.status !== "DISPUTED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      if (app.escrowTx?.yookassaPaymentId) {
        await refundEscrowOrThrow({
          idempotencyKey: `refund-moderator:${app.id}`,
          escrow: {
            yookassaPaymentId: app.escrowTx.yookassaPaymentId,
            yookassaDealId: app.escrowTx.yookassaDealId,
            amountKopecks: app.escrowTx.amountKopecks,
            netPayoutKopecks: app.escrowTx.netPayoutKopecks,
          },
          description: "Возврат по решению модератора",
        });
      }

      await ctx.db.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.application.update({
          where: { id: app.id },
          data: { status: "REFUNDED_BY_MODERATOR" },
        });
        if (app.escrowTx) {
          await tx.escrowTransaction.update({
            where: { id: app.escrowTx.id },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });
        }
        await tx.moderatorCase.update({
          where: { id: input.caseId },
          data: {
            status: "RESOLVED_FOR_SEEKER",
            notes: input.notes,
            resolvedAt: new Date(),
            moderatorId: ctx.userId,
          },
        });
        await tx.auditLog.create({
          data: {
            applicationId: app.id,
            fromStatus: "DISPUTED",
            toStatus: "REFUNDED_BY_MODERATOR",
            actor: "MODERATOR",
            actorId: ctx.userId,
            metadata: { caseId: input.caseId },
          },
        });
      });

      return { status: "RESOLVED_FOR_SEEKER" as const };
    }),

  abuseReports: moderatorProcedure
    .input(z.object({ resolved: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.abuseReport.findMany({
        where: {
          ...(input.resolved === true && { resolvedAt: { not: null } }),
          ...(input.resolved === false && { resolvedAt: null }),
        },
        include: {
          reporter: { select: { id: true, displayName: true } },
          vacancy: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  resolveAbuseReport: moderatorProcedure
    .input(
      z.object({
        reportId: z.string().uuid(),
        resolution: z.string().max(500),
        blockUser: z.boolean().optional(),
        blockVacancy: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.abuseReport.findUnique({
        where: { id: input.reportId },
      });
      if (!report) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.abuseReport.update({
        where: { id: input.reportId },
        data: { resolvedAt: new Date(), resolution: input.resolution },
      });

      if (input.blockVacancy && report.vacancyId) {
        await ctx.db.vacancy.update({
          where: { id: report.vacancyId },
          data: { status: "BLOCKED" },
        });
      }

      if (process.env.FEATURE_TELEGRAM === "true") {
        const reporterLink = await ctx.db.telegramLink.findUnique({
          where: { userId: report.reporterId },
        });
        if (reporterLink) {
          void telegramService.sendMessage({
            chatId: reporterLink.chatId.toString(),
            text: `Жалоба №${report.id} рассмотрена. Решение: ${input.resolution}`,
          });
        }
      }

      return { success: true };
    }),

  blockUser: moderatorProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        reason: z.string().max(500),
        expiresAt: z.string().datetime(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create a sanction record
      await ctx.db.referrerSanction.create({
        data: {
          referrerId: input.userId,
          sanctionType: "RESUME_HANDOFF_BAN",
          reason: input.reason,
          expiresAt: new Date(input.expiresAt),
        },
      });
      return { success: true };
    }),
});

export const reportsRouter = router({
  submitAbuseReport: protectedProcedure
    .input(
      z.object({
        vacancyId: z.string().uuid().optional(),
        reason: z.enum(["FAKE_VACANCY", "INAPPROPRIATE_BEHAVIOR", "FRAUD", "OTHER"]),
        comment: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.abuseReport.create({
        data: {
          reporterId: ctx.userId,
          vacancyId: input.vacancyId,
          reason: input.reason,
          comment: input.comment,
        },
        include: {
          vacancy: { select: { title: true } },
        },
      });

      // Notify moderators via Telegram
      const { telegramMessages } = await import("@/shared/telegram/messages");
      void telegramService.sendMessage({
        chatId: process.env.TELEGRAM_MODERATOR_CHAT_ID ?? "",
        text: telegramMessages.newAbuseReport({
          reportId: report.id,
          reason: input.reason,
          vacancyTitle: report.vacancy?.title,
        }),
      });

      if (process.env.FEATURE_TELEGRAM === "true") {
        const link = await ctx.db.telegramLink.findUnique({
          where: { userId: ctx.userId },
        });
        if (link) {
          void telegramService.sendMessage({
            chatId: link.chatId.toString(),
            text: `Жалоба №${report.id} принята. Решение модератора будет отправлено в этот чат.`,
          });
        }
      }

      return { reportId: report.id };
    }),
});
