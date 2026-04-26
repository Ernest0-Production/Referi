import { describe, it, expect } from "vitest";
import { isTerminal, isActive, TERMINAL_STATUSES, ACTIVE_STATUSES } from "../applicationStatus";
import type { ApplicationStatus } from "@prisma/client";

const ALL_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_RESUME_HANDOFF",
  "SEEKER_CANCEL_REQUESTED",
  "AWAITING_COMPANY_DECISION",
  "OFFER_ACCEPTED",
  "REJECTED_BY_REFERRER",
  "REJECTED_BY_COMPANY",
  "CANCELLED",
  "DISPUTED",
  "REFUNDED_BY_SLA",
  "REFUNDED_BY_CANCEL_ACK",
  "REFUNDED_BY_CANCEL_AUTO",
  "REFUNDED_BY_VACANCY_DELETED",
  "REFUNDED_BY_MODERATOR",
];

describe("ApplicationStatus helpers", () => {
  it("covers all statuses in either terminal or active lists", () => {
    for (const status of ALL_STATUSES) {
      const inTerminal = TERMINAL_STATUSES.includes(status);
      const inActive = ACTIVE_STATUSES.includes(status);
      expect(inTerminal || inActive, `Status ${status} should be in one list`).toBe(true);
    }
  });

  it("no status is in both terminal and active lists", () => {
    for (const status of ALL_STATUSES) {
      const inTerminal = TERMINAL_STATUSES.includes(status);
      const inActive = ACTIVE_STATUSES.includes(status);
      expect(inTerminal && inActive, `Status ${status} should not be in both lists`).toBe(false);
    }
  });

  it("isTerminal returns true for terminal statuses", () => {
    expect(isTerminal("OFFER_ACCEPTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("REFUNDED_BY_SLA")).toBe(true);
  });

  it("isTerminal returns false for active statuses", () => {
    expect(isTerminal("SUBMITTED")).toBe(false);
    expect(isTerminal("AWAITING_PAYMENT")).toBe(false);
    expect(isTerminal("DISPUTED")).toBe(false);
  });

  it("isActive returns true for active statuses", () => {
    expect(isActive("SUBMITTED")).toBe(true);
    expect(isActive("AWAITING_COMPANY_DECISION")).toBe(true);
    expect(isActive("DISPUTED")).toBe(true);
  });

  it("isActive returns false for terminal statuses", () => {
    expect(isActive("OFFER_ACCEPTED")).toBe(false);
    expect(isActive("REJECTED_BY_COMPANY")).toBe(false);
  });
});
