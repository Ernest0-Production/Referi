/**
 * Integration tests for SLA timer logic and attempt regeneration.
 * Uses mock databases and vi.useFakeTimers() to simulate time passing.
 *
 * These tests verify the business logic extracted from slaWorker handlers
 * without connecting to real Redis or PostgreSQL.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

// ─────────────────────────────────────────────
// Minimal inline business logic for testability
// (mirrors slaWorker handlers)
// ─────────────────────────────────────────────

interface MockApplication {
  id: string;
  status: string;
  paymentDeadline?: Date | null;
  resumeHandoffDeadline?: Date | null;
  cancelAckDeadline?: Date | null;
  companyDecisionDeadline?: Date | null;
}

function isPaymentDeadlineExpired(app: MockApplication, now: Date): boolean {
  return !!(app.paymentDeadline && app.paymentDeadline <= now);
}

function isResumeHandoffExpired(app: MockApplication, now: Date): boolean {
  return !!(app.resumeHandoffDeadline && app.resumeHandoffDeadline <= now);
}

function isCancelAckExpired(app: MockApplication, now: Date): boolean {
  return !!(app.cancelAckDeadline && app.cancelAckDeadline <= now);
}

function isCompanyDecisionExpired(app: MockApplication, now: Date): boolean {
  return !!(app.companyDecisionDeadline && app.companyDecisionDeadline <= now);
}

/**
 * Returns the SLA job's next fire time given creation time and delay.
 */
function nextFireAt(createdAt: Date, delayMs: number): Date {
  return new Date(createdAt.getTime() + delayMs);
}

// ─────────────────────────────────────────────
// Tests for SLA deadline logic
// ─────────────────────────────────────────────

describe("SLA deadline expiry logic", () => {
  const BASE = new Date("2025-01-01T00:00:00.000Z");

  it("payment deadline expires after SLA_PAYMENT_DEADLINE_MS", () => {
    const app: MockApplication = {
      id: "app-1",
      status: "AWAITING_PAYMENT",
      paymentDeadline: new Date(BASE.getTime() + BUSINESS_RULES.SLA_PAYMENT_DEADLINE_MS),
    };

    const justBefore = new Date(app.paymentDeadline!.getTime() - 1);
    const atDeadline = new Date(app.paymentDeadline!.getTime());
    const after = new Date(app.paymentDeadline!.getTime() + 1);

    expect(isPaymentDeadlineExpired(app, justBefore)).toBe(false);
    expect(isPaymentDeadlineExpired(app, atDeadline)).toBe(true);
    expect(isPaymentDeadlineExpired(app, after)).toBe(true);
  });

  it("resume handoff expires after SLA_RESUME_HANDOFF_MS (5 days)", () => {
    const app: MockApplication = {
      id: "app-2",
      status: "AWAITING_RESUME_HANDOFF",
      resumeHandoffDeadline: new Date(BASE.getTime() + BUSINESS_RULES.SLA_RESUME_HANDOFF_MS),
    };

    const before = new Date(app.resumeHandoffDeadline!.getTime() - 1000);
    const after = new Date(app.resumeHandoffDeadline!.getTime() + 1000);

    expect(isResumeHandoffExpired(app, before)).toBe(false);
    expect(isResumeHandoffExpired(app, after)).toBe(true);
  });

  it("cancel ack expires after SLA_CANCEL_ACK_MS (3 days)", () => {
    const app: MockApplication = {
      id: "app-3",
      status: "SEEKER_CANCEL_REQUESTED",
      cancelAckDeadline: new Date(BASE.getTime() + BUSINESS_RULES.SLA_CANCEL_ACK_MS),
    };

    const at = new Date(app.cancelAckDeadline!.getTime());
    expect(isCancelAckExpired(app, at)).toBe(true);
  });

  it("company decision expires after SLA_COMPANY_DECISION_MS (30 days)", () => {
    const app: MockApplication = {
      id: "app-4",
      status: "AWAITING_COMPANY_DECISION",
      companyDecisionDeadline: new Date(BASE.getTime() + BUSINESS_RULES.SLA_COMPANY_DECISION_MS),
    };

    const threeDaysBefore = new Date(app.companyDecisionDeadline!.getTime() - 3 * 86400_000);
    const oneSecAfter = new Date(app.companyDecisionDeadline!.getTime() + 1000);

    expect(isCompanyDecisionExpired(app, threeDaysBefore)).toBe(false);
    expect(isCompanyDecisionExpired(app, oneSecAfter)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Tests using vi.useFakeTimers for time simulation
// ─────────────────────────────────────────────

describe("SLA job scheduling with fake timers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("payment deadline fires after 5 days of virtual time", () => {
    const created = new Date();
    vi.setSystemTime(created);

    const fireAt = nextFireAt(created, BUSINESS_RULES.SLA_PAYMENT_DEADLINE_MS);
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

    // Move time forward by 5 days
    vi.advanceTimersByTime(FIVE_DAYS_MS);
    const now = new Date();

    expect(now.getTime()).toBe(created.getTime() + FIVE_DAYS_MS);
    expect(fireAt <= now).toBe(true);
  });

  it("attempt regeneration fires after 60 days", () => {
    const consumed = new Date();
    vi.setSystemTime(consumed);

    const regenAt = nextFireAt(consumed, BUSINESS_RULES.ATTEMPT_REGENERATION_MS);
    const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

    vi.advanceTimersByTime(SIXTY_DAYS);
    const now = new Date();

    expect(regenAt <= now).toBe(true);
  });

  it("attempt NOT regenerated before 60 days", () => {
    const consumed = new Date();
    vi.setSystemTime(consumed);

    const regenAt = nextFireAt(consumed, BUSINESS_RULES.ATTEMPT_REGENERATION_MS);
    const FIFTY_NINE_DAYS = 59 * 24 * 60 * 60 * 1000;

    vi.advanceTimersByTime(FIFTY_NINE_DAYS);
    const now = new Date();

    expect(regenAt > now).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Tests for deterministic jobId uniqueness
// ─────────────────────────────────────────────

describe("BullMQ deterministic jobId uniqueness", () => {
  function captureJobId(type: string, id: string): string {
    const jobIdMap: Record<string, (id: string) => string> = {
      "reaction-sla": (vacancyId) => `reaction-sla:${vacancyId}`,
      "payment-deadline": (appId) => `payment-deadline:${appId}`,
      "resume-handoff-sla": (appId) => `resume-handoff-sla:${appId}`,
      "cancel-ack-sla": (appId) => `cancel-ack-sla:${appId}`,
      "company-decision-sla": (appId) => `company-decision-sla:${appId}`,
      "attempt-regen": (ledgerEntryId) => `attempt-regen:${ledgerEntryId}`,
      "capture-escrow": (appId) => `capture-escrow:${appId}`,
      "payout-referrer": (appId) => `payout-referrer:${appId}`,
      "refund-seeker": (appId) => `refund-seeker:${appId}`,
    };
    return (jobIdMap[type] ?? ((i: string) => `unknown:${i}`))(id);
  }

  it("each job type + entity produces a unique deterministic jobId", () => {
    const seen = new Set<string>();
    const cases: [string, string][] = [
      ["reaction-sla", "vacancy-1"],
      ["payment-deadline", "app-1"],
      ["resume-handoff-sla", "app-1"],
      ["cancel-ack-sla", "app-1"],
      ["attempt-regen", "ledger-1"],
      ["capture-escrow", "app-1"],
      ["payout-referrer", "app-1"],
      ["refund-seeker", "app-1"],
    ];

    for (const [type, id] of cases) {
      const jobId = captureJobId(type, id);
      expect(seen.has(jobId), `Duplicate jobId: ${jobId}`).toBe(false);
      seen.add(jobId);
    }
  });

  it("same type + same entity always produces same jobId (idempotency)", () => {
    const jobId1 = captureJobId("payment-deadline", "app-abc");
    const jobId2 = captureJobId("payment-deadline", "app-abc");
    expect(jobId1).toBe(jobId2);
  });

  it("same type + different entities produce different jobIds", () => {
    const jobId1 = captureJobId("payment-deadline", "app-1");
    const jobId2 = captureJobId("payment-deadline", "app-2");
    expect(jobId1).not.toBe(jobId2);
  });
});

// ─────────────────────────────────────────────
// Attempt pool calculation
// ─────────────────────────────────────────────

describe("Attempt pool calculation", () => {
  const MAX = BUSINESS_RULES.MAX_REFERRER_ATTEMPTS; // 3

  function availableAttempts(activeConsumed: number): number {
    return Math.max(0, MAX - activeConsumed);
  }

  it("starts at MAX attempts", () => {
    expect(availableAttempts(0)).toBe(MAX);
  });

  it("decrements by 1 per consumed attempt", () => {
    expect(availableAttempts(1)).toBe(2);
    expect(availableAttempts(2)).toBe(1);
    expect(availableAttempts(3)).toBe(0);
  });

  it("clamps to 0 even if anomalous count", () => {
    expect(availableAttempts(10)).toBe(0);
  });

  it("regenerated attempt restores availability", () => {
    // After 60 days, consumed entry becomes inactive (regeneratesAt = past)
    // activeConsumed count drops back
    const consumed = 3;
    const regenerated = 1;
    const activeConsumed = consumed - regenerated;
    expect(availableAttempts(activeConsumed)).toBe(1);
  });
});
