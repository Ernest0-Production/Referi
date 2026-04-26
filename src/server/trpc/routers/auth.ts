import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { paymentProvider } from "@/server/services/paymentService";
import { randomUUID } from "crypto";

const LINK_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const authRouter = router({
  /** Current user + roles + attempt count */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      include: {
        githubProfile: {
          select: {
            githubLogin: true,
            githubCreatedAt: true,
            paidRegistration: true,
          },
        },
        seekerSubscription: {
          select: { status: true, currentPeriodEnd: true },
        },
      },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND" });

    const attemptLedger = await ctx.db.referrerAttemptLedger.findMany({
      where: { referrerId: ctx.userId },
      orderBy: { createdAt: "desc" },
    });

    const consumedCount = attemptLedger.filter((e) => e.event === "CONSUMED").length;
    const regeneratedCount = attemptLedger.filter((e) => e.event === "REGENERATED").length;
    const availableAttempts =
      BUSINESS_RULES.MAX_REFERRER_ATTEMPTS - consumedCount + regeneratedCount;

    return {
      id: user.id,
      displayName: user.displayName,
      roles: user.roles,
      githubLogin: user.githubProfile?.githubLogin ?? null,
      paidRegistration: user.githubProfile?.paidRegistration ?? false,
      subscription: user.seekerSubscription
        ? {
            status: user.seekerSubscription.status,
            currentPeriodEnd: user.seekerSubscription.currentPeriodEnd,
          }
        : null,
      availableAttempts: Math.max(0, availableAttempts),
    };
  }),

  /** Update display name */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { displayName: input.displayName },
        select: { id: true, displayName: true },
      });
      return updated;
    }),

  /**
   * Initiate registration fee payment for GitHub accounts < 1 year old.
   * Returns a confirmation URL to redirect the user to ЮКасса / MockProvider.
   */
  initiateRegistrationPayment: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const profile = await ctx.db.gitHubProfile.findUnique({
        where: { userId: input.userId },
      });

      if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
      if (profile.paidRegistration) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ALREADY_PAID",
        });
      }

      const idempotencyKey = randomUUID();
      const returnUrl = `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/login?registered=1`;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: BUSINESS_RULES.REGISTRATION_FEE_KOP,
        description: "Регистрационный сбор Referi",
        metadata: { userId: input.userId, type: "registration" },
        capture: true,
        returnUrl,
      });

      await ctx.db.registrationPayment.create({
        data: {
          userId: input.userId,
          amountKopecks: BUSINESS_RULES.REGISTRATION_FEE_KOP,
          yookassaPaymentId: payment.paymentId,
        },
      });

      return { confirmationUrl: payment.confirmationUrl };
    }),

  /**
   * Generate a one-time token used to link the user's Telegram account.
   * Returns a deep-link URL: https://t.me/<BOT_USERNAME>?start=<token>
   */
  generateTelegramLinkToken: protectedProcedure.mutation(async ({ ctx }) => {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

    await ctx.db.telegramLinkToken.create({
      data: { userId: ctx.userId, token, expiresAt },
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "referi_bot";
    const deepLink = `https://t.me/${botUsername}?start=${token}`;
    return { deepLink, token, expiresAt };
  }),
});
