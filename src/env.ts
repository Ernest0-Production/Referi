import { z } from "zod";

const boolFlag = z.enum(["true", "false"]);

function optionalTrimmedNonEmptyString() {
  return z.preprocess((val) => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    return s === "" ? undefined : s;
  }, z.string().optional());
}

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
    NEXTAUTH_URL: z.url(),
    GITHUB_ID: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "GITHUB_ID is required")),
    GITHUB_SECRET: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "GITHUB_SECRET is required")),
    GITHUB_TOKEN_ENCRYPTION_KEY: z.string().min(32, "GITHUB_TOKEN_ENCRYPTION_KEY must be at least 32 characters"),
    NEXT_PUBLIC_URL: z.url(),
    NEXT_PUBLIC_MODERATION_CONTACT_URL: z
      .string()
      .default("")
      .transform((s) => s.trim()),
    YOOKASSA_SHOP_ID: z.string(),
    YOOKASSA_SECRET_KEY: z.string(),
    YOOKASSA_PAYOUT_MOCK_WALLET: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "YOOKASSA_PAYOUT_MOCK_WALLET is required")),
    FEATURE_REAL_PAYMENTS: boolFlag,
    FEATURE_RATE_LIMITING: boolFlag,
    ENABLE_BULLMQ_WORKERS: boolFlag,
    SENTRY_DSN: optionalTrimmedNonEmptyString().pipe(z.url().optional()),
    NEXT_PUBLIC_SENTRY_DSN: optionalTrimmedNonEmptyString().pipe(z.url().optional()),
    SENTRY_AUTH_TOKEN: optionalTrimmedNonEmptyString(),
    SENTRY_ORG: optionalTrimmedNonEmptyString(),
    SENTRY_PROJECT: optionalTrimmedNonEmptyString(),
  })
  .superRefine((data, ctx) => {
    if (data.FEATURE_REAL_PAYMENTS === "true") {
      if (!data.YOOKASSA_SHOP_ID.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["YOOKASSA_SHOP_ID"],
          message: "YOOKASSA_SHOP_ID is required when FEATURE_REAL_PAYMENTS is true",
        });
      }
      if (!data.YOOKASSA_SECRET_KEY.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["YOOKASSA_SECRET_KEY"],
          message: "YOOKASSA_SECRET_KEY is required when FEATURE_REAL_PAYMENTS is true",
        });
      }
    }
  });

export type Env = z.output<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
