import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { paymentProvider } from "@/server/services/paymentService";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { kopecksToString } from "@/shared/utils/money";
import { randomUUID } from "crypto";

export const subscriptionsRouter = router({
  /**
   * Current subscription status for the caller.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const sub = await ctx.db.seekerSubscription.findUnique({
      where: { userId: ctx.userId },
    });
    if (!sub) return null;
    return {
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }),

  /**
   * Initiate PRO subscription payment.
   */
  initiatePro: protectedProcedure
    .input(z.object({ returnUrl: z.string().url().optional() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.seekerSubscription.findUnique({
        where: { userId: ctx.userId },
      });
      if (existing?.status === "ACTIVE") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "SUBSCRIPTION_ALREADY_ACTIVE",
        });
      }

      const idempotencyKey = randomUUID();
      const returnUrl =
        input.returnUrl ??
        `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/dashboard/profile`;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP,
        description: "Подписка Referi PRO на 1 месяц",
        metadata: { userId: ctx.userId, type: "subscription" },
        capture: true,
        returnUrl,
      });

      return {
        confirmationUrl: payment.confirmationUrl,
        paymentId: payment.paymentId,
        amountKopecks: kopecksToString(BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP),
      };
    }),

  /**
   * Cancel active PRO subscription (won't renew after currentPeriodEnd).
   */
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await ctx.db.seekerSubscription.findUnique({
      where: { userId: ctx.userId },
    });
    if (!sub || sub.status !== "ACTIVE") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "NO_ACTIVE_SUBSCRIPTION",
      });
    }

    await ctx.db.seekerSubscription.update({
      where: { userId: ctx.userId },
      data: { status: "CANCELLED" },
    });

    return { success: true };
  }),
});
