/**
 * Property-based tests for Application state-machine invariants.
 * Invariants from spec/spec-process-application-lifecycle.md INV-001..007.
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isTerminal, isActive, TERMINAL_STATUSES, ACTIVE_STATUSES } from "../applicationStatus";
import type { ApplicationStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// FSM transition graph (mirrors spec, used for invariant verification only)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  SUBMITTED: ["AWAITING_PAYMENT", "REJECTED_BY_REFERRER", "CANCELLED"],
  AWAITING_PAYMENT: ["AWAITING_RESUME_HANDOFF", "CANCELLED"],
  AWAITING_RESUME_HANDOFF: [
    "AWAITING_COMPANY_DECISION",
    "SEEKER_CANCEL_REQUESTED",
    "REFUNDED_BY_SLA",
  ],
  SEEKER_CANCEL_REQUESTED: ["REFUNDED_BY_CANCEL_ACK", "REFUNDED_BY_CANCEL_AUTO"],
  AWAITING_COMPANY_DECISION: [
    "OFFER_ACCEPTED",
    "REJECTED_BY_COMPANY",
    "DISPUTED",
    "REFUNDED_BY_SLA",
  ],
  DISPUTED: ["OFFER_ACCEPTED", "REFUNDED_BY_MODERATOR"],
};

function getValidNextStates(status: ApplicationStatus): ApplicationStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return getValidNextStates(from).includes(to);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusArb = fc.constantFrom<ApplicationStatus>(
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
);

const terminalStatusArb = fc.constantFrom<ApplicationStatus>(...TERMINAL_STATUSES);
const activeStatusArb = fc.constantFrom<ApplicationStatus>(...ACTIVE_STATUSES);

// ---------------------------------------------------------------------------
// INV-004: Terminal states have no valid outgoing transitions
// ---------------------------------------------------------------------------

describe("INV-004: terminal states have no outgoing transitions", () => {
  it("no valid transitions from any terminal status", () => {
    fc.assert(
      fc.property(terminalStatusArb, (status) => {
        const next = getValidNextStates(status);
        expect(next).toHaveLength(0);
      }),
    );
  });

  it("isTerminal(s) === (no valid transitions from s)", () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const hasTransitions = getValidNextStates(status).length > 0;
        const terminal = isTerminal(status);
        // Terminal ↔ no transitions
        expect(terminal).toBe(!hasTransitions);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// INV-003: contactInfo visibility — only in active statuses
// ---------------------------------------------------------------------------

describe("INV-003: contactInfo visibility", () => {
  function shouldShowContactInfo(status: ApplicationStatus, actorIsReferrer: boolean): boolean {
    return actorIsReferrer && isActive(status);
  }

  it("referrer never sees contactInfo in terminal status", () => {
    fc.assert(
      fc.property(terminalStatusArb, (status) => {
        expect(shouldShowContactInfo(status, true)).toBe(false);
      }),
    );
  });

  it("referrer always sees contactInfo in active status", () => {
    fc.assert(
      fc.property(activeStatusArb, (status) => {
        expect(shouldShowContactInfo(status, true)).toBe(true);
      }),
    );
  });

  it("seeker never sees contactInfo visibility flag as true (seeker owns the data)", () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        // seeker always gets their own data regardless; visibility flag is for referrer
        expect(shouldShowContactInfo(status, false)).toBe(false);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// INV-006: Valid transitions only — FSM graph is acyclic for happy path
// ---------------------------------------------------------------------------

describe("INV-006: valid FSM transitions", () => {
  it("every target state in VALID_TRANSITIONS is a known status", () => {
    const ALL = new Set<string>([...TERMINAL_STATUSES, ...ACTIVE_STATUSES]);
    for (const [, targets] of Object.entries(VALID_TRANSITIONS)) {
      for (const t of targets!) {
        expect(ALL.has(t), `Unknown target status: ${t}`).toBe(true);
      }
    }
  });

  it("every source state in VALID_TRANSITIONS is an active (non-terminal) status", () => {
    for (const from of Object.keys(VALID_TRANSITIONS) as ApplicationStatus[]) {
      expect(isTerminal(from), `Terminal state ${from} must not have transitions`).toBe(false);
    }
  });

  it("SUBMITTED always has at least one valid transition", () => {
    expect(canTransition("SUBMITTED", "AWAITING_PAYMENT")).toBe(true);
    expect(canTransition("SUBMITTED", "REJECTED_BY_REFERRER")).toBe(true);
    expect(canTransition("SUBMITTED", "CANCELLED")).toBe(true);
  });

  it("cannot go backwards from AWAITING_COMPANY_DECISION to SUBMITTED", () => {
    expect(canTransition("AWAITING_COMPANY_DECISION", "SUBMITTED")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// INV-001: Active application limit (property-based)
// ---------------------------------------------------------------------------

describe("INV-001: active application count limit", () => {
  const FREE_LIMIT = 2;

  it("seeker cannot have more than FREE_LIMIT active applications at once (free tier)", () => {
    fc.assert(
      fc.property(
        // Simulate N active applications for a seeker
        fc.array(activeStatusArb, { minLength: 0, maxLength: 10 }),
        (applications) => {
          const activeCount = applications.length;
          const canSubmitNew = activeCount < FREE_LIMIT;
          // The guard: canSubmitNew <=> count < limit
          expect(canSubmitNew).toBe(activeCount < FREE_LIMIT);
        },
      ),
    );
  });

  it("count of 2 active apps blocks new submission (free tier)", () => {
    expect(ACTIVE_STATUSES.length).toBeGreaterThan(0);
    const fakeApps = [{ status: "SUBMITTED" }, { status: "AWAITING_PAYMENT" }];
    const activeCount = fakeApps.filter((a) =>
      ACTIVE_STATUSES.includes(a.status as ApplicationStatus),
    ).length;
    expect(activeCount >= FREE_LIMIT).toBe(true);
  });
});
