/**
 * SLA Worker — handles all SLA timer jobs.
 * spec/spec-process-referrer-sla.md
 */

import { Queue, Worker, type Job } from "bullmq";
import type { Prisma } from "@prisma/client"
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { refundEscrowOrThrow } from "@/server/services/paymentService";
import { createReferrerAttemptRepository } from "@/server/repositories/referrerAttemptRepository";
import { telegramService } from "@/server/services/telegramService";
import { telegramMessages } from "@/shared/telegram/messages";

export type SLAJobType =
  | "reaction-sla"
  | "payment-deadline"
  | "resume-handoff-sla"
  | "cancel-ack-sla"
  | "company-decision-sla"
  | "vacancy-unfreeze"
  | "attempt-regen";

export interface SLAJobData {
  type: SLAJobType;
  applicationId?: string;
  vacancyId?: string;
  referrerId?: string;
  ledgerEntryId?: string;
}

let _slaQueue: Queue<SLAJobData> | null = null;

function getSlaQueue() {
  if (!_slaQueue) {
    _slaQueue = new Queue<SLAJobData>("sla", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return _slaQueue;
}

export async function scheduleReactionSLA(vacancyId: string) {
  await getSlaQueue().add(
    "sla-job",
    { type: "reaction-sla", vacancyId },
    {
      jobId: `reaction-sla:${vacancyId}`,
      delay: BUSINESS_RULES.SLA_REFERRER_REACTION_MS,
    },
  );
}

export async function schedulePaymentDeadline(applicationId: string) {
  await getSlaQueue().add(
    "sla-job",
    { type: "payment-deadline", applicationId },
    {
      jobId: `payment-deadline:${applicationId}`,
      delay: BUSINESS_RULES.SLA_PAYMENT_DEADLINE_MS,
    },
  );
}

export async function scheduleResumeHandoffSLA(applicationId: string) {
  await getSlaQueue().add(
    "sla-job",
    { type: "resume-handoff-sla", applicationId },
    {
      jobId: `resume-handoff-sla:${applicationId}`,
      delay: BUSINESS_RULES.SLA_RESUME_HANDOFF_MS,
    },
  );
}

export async function scheduleCancelAckSLA(applicationId: string) {
  await getSlaQueue().add(
    "sla-job",
    { type: "cancel-ack-sla", applicationId },
    {
      jobId: `cancel-ack-sla:${applicationId}`,
      delay: BUSINESS_RULES.SLA_CANCEL_ACK_MS,
    },
  );
}

export async function scheduleCompanyDecisionSLA(applicationId: string) {
  await getSlaQueue().add(
    "sla-job",
    { type: "company-decision-sla", applicationId },
    {
      jobId: `company-decision-sla:${applicationId}`,
      delay: BUSINESS_RULES.SLA_COMPANY_DECISION_MS,
    },
  );
}

export async function scheduleAttemptRegeneration(
  ledgerEntryId: string,
  referrerId: string,
  applicationId: string,
) {
  await getSlaQueue().add(
    "sla-job",
    { type: "attempt-regen", ledgerEntryId, referrerId, applicationId },
    {
      jobId: `attempt-regen:${ledgerEntryId}`,
      delay: BUSINESS_RULES.ATTEMPT_REGENERATION_MS,
    },
  );
}

export async function cancelSLAJob(jobId: string) {
  const job = await getSlaQueue().getJob(jobId);
  if (job) await job.remove();
}

// ─────────────────────────────────────────────
// Worker processor
// ─────────────────────────────────────────────

async function processSLAJob(job: Job<SLAJobData>) {
  const { type, applicationId, vacancyId, referrerId, ledgerEntryId } = job.data;

  switch (type) {
    case "reaction-sla":
      if (vacancyId) await handleReactionSLA(vacancyId);
      break;
    case "payment-deadline":
      if (applicationId) await handlePaymentDeadline(applicationId);
      break;
    case "resume-handoff-sla":
      if (applicationId) await handleResumeHandoffSLA(applicationId);
      break;
    case "cancel-ack-sla":
      if (applicationId) await handleCancelAckSLA(applicationId);
      break;
    case "company-decision-sla":
      if (applicationId) await handleCompanyDecisionSLA(applicationId);
      break;
    case "attempt-regen":
      if (referrerId && applicationId && ledgerEntryId) {
        await handleAttemptRegeneration(referrerId, applicationId, ledgerEntryId);
      }
      break;
    case "vacancy-unfreeze":
      if (vacancyId) await handleVacancyUnfreeze(vacancyId);
      break;
  }
}

async function handleReactionSLA(vacancyId: string) {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || vacancy.status !== "ACTIVE") return;

  // Check if referrer reacted (any application not in SUBMITTED)
  const reactedCount = await prisma.application.count({
    where: {
      vacancyId,
      status: {
        notIn: [
          "SUBMITTED",
          "CANCELLED",
          "REJECTED_BY_REFERRER",
          "REJECTED_BY_COMPANY",
          "REFUNDED_BY_SLA",
          "REFUNDED_BY_CANCEL_ACK",
          "REFUNDED_BY_CANCEL_AUTO",
          "REFUNDED_BY_VACANCY_DELETED",
          "REFUNDED_BY_MODERATOR",
        ],
      },
    },
  });

  if (reactedCount > 0) return; // Referrer already reacted

  const frozenUntil = new Date(Date.now() + BUSINESS_RULES.SANCTION_REACTION_FREEZE_MS);

  await prisma.vacancy.update({
    where: { id: vacancyId },
    data: { status: "FROZEN", frozenUntil },
  });

  // Schedule unfreeze
  await getSlaQueue().add(
    "sla-job",
    { type: "vacancy-unfreeze", vacancyId },
    {
      jobId: `vacancy-unfreeze:${vacancyId}`,
      delay: BUSINESS_RULES.SANCTION_REACTION_FREEZE_MS,
    },
  );
}

async function handlePaymentDeadline(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app || app.status !== "AWAITING_PAYMENT") return;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "CANCELLED", paymentDeadline: null },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_PAYMENT",
        toStatus: "CANCELLED",
        actor: "SYSTEM",
        metadata: { reason: "payment_deadline_expired" },
      },
    });
  });
}

async function handleResumeHandoffSLA(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      escrowTx: true,
      vacancy: { select: { referrerId: true } },
    },
  });
  if (!app || app.status !== "AWAITING_RESUME_HANDOFF") return;

  // Refund if escrow exists
  if (app.escrowTx?.yookassaPaymentId) {
    try {
      await refundEscrowOrThrow({
        idempotencyKey: `refund-sla:${applicationId}`,
        escrow: {
          yookassaPaymentId: app.escrowTx.yookassaPaymentId,
          yookassaDealId: app.escrowTx.yookassaDealId,
          amountKopecks: app.escrowTx.amountKopecks,
          netPayoutKopecks: app.escrowTx.netPayoutKopecks,
        },
        description: "Возврат по истечении SLA передачи резюме",
      });
    } catch (err) {
      console.error("[SLA] Refund failed:", err);
    }
  }

  const banExpiresAt = new Date(Date.now() + BUSINESS_RULES.SANCTION_RESUME_BAN_MS);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "REFUNDED_BY_SLA", resumeHandoffDeadline: null },
    });
    if (app.escrowTx) {
      await tx.escrowTransaction.update({
        where: { id: app.escrowTx.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
    }
    await tx.referrerSanction.create({
      data: {
        referrerId: app.vacancy.referrerId,
        sanctionType: "RESUME_HANDOFF_BAN",
        reason: "Не передал резюме HR в установленный срок",
        expiresAt: banExpiresAt,
        applicationId,
      },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_RESUME_HANDOFF",
        toStatus: "REFUNDED_BY_SLA",
        actor: "SYSTEM",
        metadata: { reason: "resume_handoff_sla_expired" },
      },
    });
  });
}

async function handleCompanyDecisionSLA(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      vacancy: { select: { id: true, title: true, referrerId: true } },
    },
  });
  if (!app || app.status !== "AWAITING_COMPANY_DECISION") return;

  const existingCase = await prisma.moderatorCase.findUnique({
    where: { applicationId },
  });
  if (existingCase) return;

  const moderatorCase = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "DISPUTED", companyDecisionDeadline: null },
    });
    const mc = await tx.moderatorCase.create({
      data: { applicationId },
    });
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "AWAITING_COMPANY_DECISION",
        toStatus: "DISPUTED",
        actor: "SYSTEM",
        metadata: { reason: "company_decision_sla_expired" },
      },
    });
    return mc;
  });

  void (async () => {
    try {
      const ref = await prisma.user.findUnique({
        where: { id: app.vacancy.referrerId },
        select: { displayName: true },
      });
      await telegramService.sendMessage({
        chatId: process.env.TELEGRAM_MODERATOR_CHAT_ID ?? "",
        text: telegramMessages.newDispute({
          caseId: moderatorCase.id,
          appId: applicationId,
          referrerName: ref?.displayName ?? app.vacancy.referrerId,
        }),
      });
    } catch (e) {
      console.error("[SLA] company-decision: telegram failed", e);
    }
  })();
}

async function handleCancelAckSLA(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { escrowTx: true },
  });
  if (!app || app.status !== "SEEKER_CANCEL_REQUESTED") return;

  // Auto-refund
  if (app.escrowTx?.yookassaPaymentId) {
    try {
      await refundEscrowOrThrow({
        idempotencyKey: `refund-cancel-auto:${applicationId}`,
        escrow: {
          yookassaPaymentId: app.escrowTx.yookassaPaymentId,
          yookassaDealId: app.escrowTx.yookassaDealId,
          amountKopecks: app.escrowTx.amountKopecks,
          netPayoutKopecks: app.escrowTx.netPayoutKopecks,
        },
        description: "Авто-возврат по запросу соискателя",
      });
    } catch (err) {
      console.error("[SLA] Cancel-auto refund failed:", err);
    }
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.application.update({
      where: { id: applicationId },
      data: { status: "REFUNDED_BY_CANCEL_AUTO", cancelAckDeadline: null },
    });
    if (app.escrowTx) {
      await tx.escrowTransaction.update({
        where: { id: app.escrowTx.id },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
    }
    await tx.auditLog.create({
      data: {
        applicationId,
        fromStatus: "SEEKER_CANCEL_REQUESTED",
        toStatus: "REFUNDED_BY_CANCEL_AUTO",
        actor: "SYSTEM",
        metadata: { reason: "cancel_ack_sla_expired" },
      },
    });
  });
}

async function handleAttemptRegeneration(
  referrerId: string,
  applicationId: string,
  ledgerEntryId: string,
) {
  const attemptRepo = createReferrerAttemptRepository(prisma);
  await attemptRepo.regenerate(referrerId, applicationId);

  // Update the CONSUMED entry's regeneratesAt to past (mark as regenerated)
  await prisma.referrerAttemptLedger.update({
    where: { id: ledgerEntryId },
    data: { regeneratesAt: new Date(0) },
  });
}

async function handleVacancyUnfreeze(vacancyId: string) {
  const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId } });
  if (!vacancy || vacancy.status !== "FROZEN") return;

  await prisma.vacancy.update({
    where: { id: vacancyId },
    data: { status: "ACTIVE", frozenUntil: null },
  });
}

// Start the worker (called from server startup)
export function startSLAWorker() {
  const worker = new Worker<SLAJobData>("sla", processSLAJob, {
    connection: redis,
    concurrency: 5,
  });

  worker.on("failed", (job, err) => {
    console.error(`[SLA Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
