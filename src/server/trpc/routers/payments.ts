import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { paymentProvider } from "@/server/services/paymentService";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { kopecksToString } from "@/shared/utils/money";
import { randomUUID } from "crypto";

export const paymentsRouter = router({
  /**
   * Initiate escrow payment for a submitted application.
   * Returns a YooKassa confirmation URL (or mock URL for dev).
   */
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
        // Check current status; if still pending, return existing payment id
        const status = await paymentProvider.getPaymentStatus(existingTx.yookassaPaymentId);
        if (status === "pending" || status === "waiting_for_capture") {
          return {
            confirmationUrl: null,
            paymentId: existingTx.yookassaPaymentId,
          };
        }
      }

      const idempotencyKey = randomUUID();
      const amountKopecks = app.vacancy.rewardKopecks;

      // Use platform-defined fee if vacancy reward is 0
      const chargeAmount =
        amountKopecks === 0n ? BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP : amountKopecks;

      const returnUrl = `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/dashboard/applications/${app.id}`;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: chargeAmount,
        description: `Заявка на вакансию "${app.vacancy.title}" в ${app.vacancy.companyName}`,
        metadata: { applicationId: app.id, type: "escrow" },
        capture: false, // hold until confirmReferralIntent
        returnUrl,
      });

      const { calculateCommission } = await import("@/shared/utils/money");
      const { commission, netPayout } = calculateCommission(chargeAmount);

      await ctx.db.escrowTransaction.upsert({
        where: { applicationId: input.applicationId },
        create: {
          applicationId: input.applicationId,
          amountKopecks: chargeAmount,
          commissionKopecks: commission,
          netPayoutKopecks: netPayout,
          yookassaPaymentId: payment.paymentId,
          heldAt: new Date(),
        },
        update: {
          yookassaPaymentId: payment.paymentId,
        },
      });

      return {
        confirmationUrl: payment.confirmationUrl,
        paymentId: payment.paymentId,
        amountKopecks: kopecksToString(chargeAmount),
      };
    }),

  /**
   * Returns current escrow status for an application.
   */
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
        paymentId: tx.yookassaPaymentId,
        amountKopecks: kopecksToString(tx.amountKopecks),
        capturedAt: tx.capturedAt,
        refundedAt: tx.refundedAt,
      };
    }),
});
