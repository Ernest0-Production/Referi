import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

const presetParamsSchema = z.object({
  specialty: z.string().max(500).optional(),
  grade: z.string().max(200).optional(),
  workFormat: z.string().max(100).optional(),
  salaryFrom: z.string().max(20).optional(),
  sort: z.string().max(32).optional(),
  query: z.string().max(200).optional(),
});

export const vacancySearchPresetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.vacancySearchPreset.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, params: true, updatedAt: true },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        params: presetParamsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.vacancySearchPreset.create({
        data: {
          userId: ctx.userId,
          name: input.name.trim(),
          params: input.params,
        },
        select: { id: true, name: true, params: true },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        params: presetParamsSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owned = await ctx.db.vacancySearchPreset.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { id: true },
      });
      if (!owned) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.vacancySearchPreset.update({
        where: { id: input.id },
        data: { params: input.params },
        select: { id: true, name: true, params: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.vacancySearchPreset.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
    }),
});
