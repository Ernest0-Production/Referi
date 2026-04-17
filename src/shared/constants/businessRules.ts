/**
 * Business rules configuration for Referi.
 * All SLA timeouts, limits, and pricing are defined here.
 * Source of truth: spec/spec-process-referrer-sla.md
 */

export const BUSINESS_RULES = {
  // SLA durations (milliseconds)
  SLA_REFERRER_REACTION_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SLA_PAYMENT_DEADLINE_MS: 5 * 24 * 60 * 60 * 1000, // 5 days
  SLA_RESUME_HANDOFF_MS: 5 * 24 * 60 * 60 * 1000, // 5 days
  SLA_CANCEL_ACK_MS: 3 * 24 * 60 * 60 * 1000, // 3 days
  SLA_COMPANY_DECISION_MS: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Sanctions (milliseconds)
  SANCTION_RESUME_BAN_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  SANCTION_REACTION_FREEZE_MS: 14 * 24 * 60 * 60 * 1000, // 14 days

  // Referrer attempt pool
  MAX_REFERRER_ATTEMPTS: 3,
  ATTEMPT_REGENERATION_MS: 60 * 24 * 60 * 60 * 1000, // 60 days

  // Seeker application limits
  FREE_ACTIVE_APPLICATIONS: 2,
  PRO_ACTIVE_APPLICATIONS: 5,

  // Pricing (kopecks: 1 ruble = 100 kopecks)
  PAID_APPLICATION_PRICE_KOP: BigInt(199_00), // 199 ₽
  PRO_SUBSCRIPTION_PRICE_KOP: BigInt(499_00), // 499 ₽/month
  PLATFORM_COMMISSION_RATE: 0.1, // 10%

  // Registration fee for GitHub accounts < 1 year old
  // ~50 000 ₽ equivalent of $500 at April 2026 exchange rate
  REGISTRATION_FEE_KOP: BigInt(50_000_00),

  // GitHub account age requirement (days)
  GITHUB_ACCOUNT_MIN_AGE_DAYS: 365,

  // Paid application token validity (days)
  PAID_APPLICATION_TOKEN_VALIDITY_DAYS: 30,
} as const;

export type BusinessRules = typeof BUSINESS_RULES;
