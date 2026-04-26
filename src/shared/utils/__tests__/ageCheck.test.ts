import { describe, it, expect } from "vitest";
import { isGitHubAccountOldEnough } from "../ageCheck";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

const MIN_DAYS = BUSINESS_RULES.GITHUB_ACCOUNT_MIN_AGE_DAYS;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, from = new Date()): Date {
  return new Date(from.getTime() - days * MS_PER_DAY);
}

describe("isGitHubAccountOldEnough", () => {
  it("returns true for an account exactly at the minimum age", () => {
    const now = new Date();
    const createdAt = daysAgo(MIN_DAYS, now);
    expect(isGitHubAccountOldEnough(createdAt, now)).toBe(true);
  });

  it("returns true for an account older than the minimum", () => {
    const now = new Date();
    const createdAt = daysAgo(MIN_DAYS + 1, now);
    expect(isGitHubAccountOldEnough(createdAt, now)).toBe(true);
  });

  it("returns false for an account 1 day short of the minimum", () => {
    const now = new Date();
    const createdAt = daysAgo(MIN_DAYS - 1, now);
    expect(isGitHubAccountOldEnough(createdAt, now)).toBe(false);
  });

  it("returns false for a brand-new account (0 days)", () => {
    const now = new Date();
    expect(isGitHubAccountOldEnough(now, now)).toBe(false);
  });

  it("returns false for an account created 1 hour ago", () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 60 * 60 * 1000);
    expect(isGitHubAccountOldEnough(createdAt, now)).toBe(false);
  });

  it("returns true for an account 3 years old", () => {
    const now = new Date();
    const createdAt = daysAgo(365 * 3, now);
    expect(isGitHubAccountOldEnough(createdAt, now)).toBe(true);
  });
});
