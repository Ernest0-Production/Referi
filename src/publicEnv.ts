import { z } from "zod";

/**
 * Public env vars only (client bundle).
 * Do not import `src/env.ts` here — secrets and full Node schema live there.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_MODERATION_CONTACT_URL: z
    .union([z.string(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : "")),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_MODERATION_CONTACT_URL: process.env.NEXT_PUBLIC_MODERATION_CONTACT_URL,
});
