import { BUSINESS_RULES } from "@/shared/constants/businessRules";

const MIN_AGE_MS = BUSINESS_RULES.GITHUB_ACCOUNT_MIN_AGE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Returns true when the GitHub account is old enough to register for free.
 * Extracted for testability; the same logic is used in the Auth.js signIn callback.
 */
export function isGitHubAccountOldEnough(githubCreatedAt: Date, now = new Date()): boolean {
  return now.getTime() - githubCreatedAt.getTime() >= MIN_AGE_MS;
}
