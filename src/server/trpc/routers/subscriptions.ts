import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { env } from "@/env";
import { paymentProvider } from "@/server/services/paymentService";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { kopecksToString } from "@/shared/utils/money";
import { randomUuid } from "@/lib/randomUuid";
import { ru } from "@/locales";

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
      autoRenewEnabled: sub.status === "ACTIVE",
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
      const now = new Date();
      if (existing?.status === "ACTIVE" && existing.currentPeriodEnd > now) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "SUBSCRIPTION_ALREADY_ACTIVE",
        });
      }

      const idempotencyKey = randomUuid();
      const returnUrl = input.returnUrl ?? `${env.NEXT_PUBLIC_URL}/dashboard/profile`;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP,
        description: ru.server.subscriptions.proMonthly,
        metadata: { userId: ctx.userId, type: "subscription" },
        capture: true,
        returnUrl,
        savePaymentMethod: true,
      });

      return {
        confirmationUrl: payment.confirmationUrl,
        paymentId: payment.paymentId,
        amountKopecks: kopecksToString(BUSINESS_RULES.PRO_SUBSCRIPTION_PRICE_KOP),
      };
    }),

  /**
   * Cancel active PRO subscription (immediate downgrade to free tier for new applications;
   * saved payment method stops being used for autopayment).
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
