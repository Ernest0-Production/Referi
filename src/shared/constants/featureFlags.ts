import { env } from "@/env";

/**
 * Feature flags from validated environment (see `src/env.ts`).
 */
export const FEATURE_FLAGS = {
  /** Enable real YooKassa payments (vs MockPaymentProvider) */
  REAL_PAYMENTS: env.FEATURE_REAL_PAYMENTS === "true",
  /** Enable request rate limiting */
  RATE_LIMITING: env.FEATURE_RATE_LIMITING === "true",
} as const;
