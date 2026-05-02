import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { env } from "@/env";
import { paymentProvider } from "@/server/services/paymentService";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { kopecksToString } from "@/shared/utils/money";
import { randomUUID } from "crypto";

export const paymentsRouter = router({
  initiateEscrow: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: {
          vacancy: {
            select: {
              id: true,
              title: true,
              companyName: true,
              rewardKopecks: true,
            },
          },
        },
      });

      if (!app) throw new TRPCError({ code: "NOT_FOUND" });
      if (app.seekerId !== ctx.userId) throw new TRPCError({ code: "FORBIDDEN" });
      if (app.status !== "AWAITING_PAYMENT") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "APPLICATION_WRONG_STATUS",
        });
      }

      const existingTx = await ctx.db.escrowTransaction.findFirst({
        where: { applicationId: input.applicationId },
      });

      if (existingTx?.yookassaPaymentId) {
        const status = await paymentProvider.getPaymentStatus(existingTx.yookassaPaymentId);
        if (status === "pending" || status === "waiting_for_capture" || status === "succeeded") {
          return {
            confirmationUrl: null,
            paymentId: existingTx.yookassaPaymentId,
            dealId: existingTx.yookassaDealId,
          };
        }
      }

      const idDeal = randomUUID();
      const idPay = randomUUID();
      const amountKopecks = app.vacancy.rewardKopecks;
      if (amountKopecks <= 0n) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "FREE_REFERRAL_NO_PAYMENT_REQUIRED",
        });
      }
      const chargeAmount = amountKopecks;

      const returnUrl = `${env.NEXT_PUBLIC_URL}/dashboard/applications/${app.id}`;

      const { calculateCommission } = await import("@/shared/utils/money");
      const { commission, netPayout } = calculateCommission(chargeAmount);

      const deal = await paymentProvider.createSafeDeal({
        idempotencyKey: idDeal,
        description: `Сделка Referi по заявке ${app.id}`,
        metadata: { applicationId: app.id, type: "escrow" },
      });

      const payment = await paymentProvider.createDealPayment({
        idempotencyKey: idPay,
        dealId: deal.dealId,
        amountKopecks: chargeAmount,
        payoutSettlementKopecks: netPayout,
        description: `Заявка на вакансию "${app.vacancy.title}" в ${app.vacancy.companyName}`,
        metadata: { applicationId: app.id, type: "escrow" },
        returnUrl,
      });

      await ctx.db.escrowTransaction.upsert({
        where: { applicationId: input.applicationId },
        create: {
          applicationId: input.applicationId,
          amountKopecks: chargeAmount,
          commissionKopecks: commission,
          netPayoutKopecks: netPayout,
          yookassaDealId: deal.dealId,
          yookassaPaymentId: payment.paymentId,
        },
        update: {
          yookassaDealId: deal.dealId,
          yookassaPaymentId: payment.paymentId,
        },
      });

      return {
        confirmationUrl: payment.confirmationUrl,
        paymentId: payment.paymentId,
        dealId: deal.dealId,
        amountKopecks: kopecksToString(chargeAmount),
      };
    }),

  initiatePaidApplicationToken: protectedProcedure
    .input(z.object({ vacancyId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const vacancy = await ctx.db.vacancy.findUnique({
        where: { id: input.vacancyId },
      });
      if (!vacancy || vacancy.status !== "ACTIVE") {
        throw new TRPCError({ code: "NOT_FOUND", message: "VACANCY_NOT_ACTIVE" });
      }

      const idempotencyKey = randomUUID();
      const expiresAt = new Date(
        Date.now() + BUSINESS_RULES.PAID_APPLICATION_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
      );

      const token = await ctx.db.paidApplicationToken.create({
        data: {
          seekerId: ctx.userId,
          vacancyId: input.vacancyId,
          amountKopecks: BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP,
          expiresAt,
        },
      });

      const returnUrl = `${env.NEXT_PUBLIC_URL}/dashboard/applications/new?vacancyId=${input.vacancyId}&paidTokenId=${token.id}`;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP,
        description: `Дополнительный отклик на вакансию «${vacancy.title}»`,
        metadata: {
          type: "paid_token",
          tokenId: token.id,
          seekerId: ctx.userId,
          vacancyId: input.vacancyId,
        },
        capture: true,
        returnUrl,
      });

      await ctx.db.paidApplicationToken.update({
        where: { id: token.id },
        data: { yookassaPaymentId: payment.paymentId },
      });

      return {
        confirmationUrl: payment.confirmationUrl,
        paymentId: payment.paymentId,
        tokenId: token.id,
        amountKopecks: kopecksToString(BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP),
      };
    }),

  escrowStatus: protectedProcedure
    .input(z.object({ applicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.application.findUnique({
        where: { id: input.applicationId },
        include: { vacancy: { select: { referrerId: true } } },
      });
      if (!app) throw new TRPCError({ code: "NOT_FOUND" });

      const isParticipant = app.seekerId === ctx.userId || app.vacancy.referrerId === ctx.userId;
      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });

      const tx = await ctx.db.escrowTransaction.findFirst({
        where: { applicationId: input.applicationId },
      });

      if (!tx) return null;

      return {
        dealId: tx.yookassaDealId,
        paymentId: tx.yookassaPaymentId,
        amountKopecks: kopecksToString(tx.amountKopecks),
        capturedAt: tx.capturedAt,
        refundedAt: tx.refundedAt,
      };
    }),
});
