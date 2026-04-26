/**
 * Feature flags read from environment variables at runtime.
 * All flags default to false (safe off).
 */
export const FEATURE_FLAGS = {
  /** Enable real YooKassa payments (vs MockPaymentProvider) */
  REAL_PAYMENTS: process.env.FEATURE_REAL_PAYMENTS === "true",
  /** Enable Telegram bot integration */
  TELEGRAM: process.env.FEATURE_TELEGRAM === "true",
  /** Enable email notifications */
  EMAIL: process.env.FEATURE_EMAIL === "true",
  /** Enable request rate limiting */
  RATE_LIMITING: process.env.FEATURE_RATE_LIMITING === "true",
} as const;
