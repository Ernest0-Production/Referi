import { z } from "zod";

/**
 * Только публичные переменные для клиентского бандла.
 * Не импортировать сюда `src/env.ts` — там секреты и полная схема Node.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_MODERATION_CONTACT_URL: z
    .union([z.string(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : "")),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_MODERATION_CONTACT_URL: process.env.NEXT_PUBLIC_MODERATION_CONTACT_URL,
});
