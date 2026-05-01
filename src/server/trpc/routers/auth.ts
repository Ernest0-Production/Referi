import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { paymentProvider } from "@/server/services/paymentService";
import type { UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

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
          select: { status: true, currentPeriodEnd: true, currentPeriodStart: true },
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
    const attemptRegenerations = user.roles.includes("REFERRER")
      ? await ctx.db.referrerAttemptLedger.findMany({
          where: {
            referrerId: ctx.userId,
            event: "CONSUMED",
            regeneratesAt: { gt: new Date() },
          },
          select: { applicationId: true, regeneratesAt: true },
          orderBy: { regeneratesAt: "asc" },
        })
      : [];

    return {
      id: user.id,
      displayName: user.displayName,
      contactInfo: user.contactInfo ?? null,
      bio: user.bio ?? null,
      email: user.email ?? null,
      roles: user.roles,
      githubLogin: user.githubProfile?.githubLogin ?? null,
      paidRegistration: user.githubProfile?.paidRegistration ?? false,
      subscription: user.seekerSubscription
        ? {
            status: user.seekerSubscription.status,
            currentPeriodStart: user.seekerSubscription.currentPeriodStart,
            currentPeriodEnd: user.seekerSubscription.currentPeriodEnd,
            autoRenewEnabled: user.seekerSubscription.status === "ACTIVE",
          }
        : null,
      availableAttempts: Math.max(0, availableAttempts),
      attemptRegenerations,
    };
  }),

  /** Update user profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(100),
        contactInfo: z.string().max(500).optional(),
        bio: z.string().max(1000).optional(),
        roles: z.array(z.enum(["SEEKER", "REFERRER"])).min(1).max(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { roles: true },
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const retainedPrivilegedRoles = current.roles.filter(
        (r) => r === "MODERATOR" || r === "ADMIN",
      );
      const selectedFunctionalRoles = input.roles
        ? Array.from(new Set(input.roles))
        : current.roles.filter((r) => r === "SEEKER" || r === "REFERRER");
      const nextRoles = [
        ...retainedPrivilegedRoles,
        ...(selectedFunctionalRoles.length > 0 ? selectedFunctionalRoles : ["SEEKER"]),
      ] as UserRole[];

      const updated = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: {
          displayName: input.displayName.trim(),
          contactInfo: input.contactInfo?.trim() || null,
          bio: input.bio?.trim() || null,
          roles: nextRoles,
        },
        select: {
          id: true,
          displayName: true,
          contactInfo: true,
          bio: true,
          roles: true,
        },
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
      const feeKopecks = BUSINESS_RULES.REGISTRATION_FEE_KOP;

      const payment = await paymentProvider.createPayment({
        idempotencyKey,
        amountKopecks: feeKopecks,
        description: "Регистрационный сбор Referi",
        metadata: { userId: input.userId, type: "registration" },
        capture: true,
        returnUrl,
      });

      await ctx.db.registrationPayment.create({
        data: {
          userId: input.userId,
          amountKopecks: feeKopecks,
          yookassaPaymentId: payment.paymentId,
        },
      });

      return { confirmationUrl: payment.confirmationUrl };
    }),
});
