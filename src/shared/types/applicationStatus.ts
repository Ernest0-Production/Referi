import type { ApplicationStatus } from "@prisma/client";

/**
 * Terminal application statuses — no transitions allowed from these.
 */
export const TERMINAL_STATUSES: ApplicationStatus[] = [
  "OFFER_ACCEPTED",
  "REJECTED_BY_REFERRER",
  "REJECTED_BY_COMPANY",
  "CANCELLED",
  "REFUNDED_BY_SLA",
  "REFUNDED_BY_CANCEL_ACK",
  "REFUNDED_BY_CANCEL_AUTO",
  "REFUNDED_BY_VACANCY_DELETED",
  "REFUNDED_BY_MODERATOR",
];

/**
 * Active (non-terminal) application statuses.
 * Applications in these statuses count toward a seeker's active application limit.
 */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_RESUME_HANDOFF",
  "SEEKER_CANCEL_REQUESTED",
  "AWAITING_COMPANY_DECISION",
  "DISPUTED",
];

/**
 * Statuses where the referrer has an active review slot occupied.
 */
export const REFERRER_ACTIVE_REVIEW_STATUSES: ApplicationStatus[] = [
  "AWAITING_PAYMENT",
  "AWAITING_RESUME_HANDOFF",
  "SEEKER_CANCEL_REQUESTED",
  "AWAITING_COMPANY_DECISION",
  "DISPUTED",
];

export function isTerminal(status: ApplicationStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function isActive(status: ApplicationStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
