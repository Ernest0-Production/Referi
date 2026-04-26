/**
 * Payment Worker — processes payment capture and payout jobs asynchronously.
 * All jobs use deterministic `jobId` for idempotency.
 */

import { Queue, Worker, type Job } from "bullmq";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { paymentProvider } from "@/server/services/paymentService";
import { calculateCommission } from "@/shared/utils/money";

// ─────────────────────────────────────────────
// Job types
// ─────────────────────────────────────────────

export type PaymentJobType =
  | "capture-escrow"
  | "payout-referrer"
  | "refund-seeker"
  | "registration-payment-check"
  | "offer-accepted";

export interface PaymentJobData {
  type: PaymentJobType;
  applicationId?: string;
  userId?: string;
  yookassaPaymentId?: string;
  amountKopecks?: string;
  idempotencyKey: string;
}

// ─────────────────────────────────────────────
// Queue
// ─────────────────────────────────────────────

let _paymentQueue: Queue<PaymentJobData> | null = null;

function getPaymentQueue() {
  if (!_paymentQueue) {
    _paymentQueue = new Queue<PaymentJobData>("payments", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
      },
    });
  }
  return _paymentQueue;
}

// ─────────────────────────────────────────────
// Payout destination (User field or env fallback)
// ─────────────────────────────────────────────

async function getReferrerPayoutDestination(referrerId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { yookassaPayoutDestination: true },
  });
  const d = u?.yookassaPayoutDestination?.trim();
  if (d) return d;
  return process.env.YOOKASSA_PAYOUT_MOCK_WALLET?.trim() ?? "mock_payout_referrer_dev";
}

// ─────────────────────────────────────────────
// Schedule helpers (idempotent via jobId)
// ─────────────────────────────────────────────

export async function scheduleCaptureEscrow(applicationId: string, idempotencyKey: string) {
  await getPaymentQueue().add(
    "payment-job",
    { type: "capture-escrow", applicationId, idempotencyKey },
    { jobId: `capture-escrow:${applicationId}` },
  );
}

export async function schedulePayoutReferrer(
  applicationId: string,
  amountKopecks: bigint,
  idempotencyKey: string,
) {
  await getPaymentQueue().add(
    "payment-job",
    {
      type: "payout-referrer",
      applicationId,
      amountKopecks: amountKopecks.toString(),
      idempotencyKey,
    },
    { jobId: `payout-referrer:${applicationId}` },
  );
}

export async function scheduleRefundSeeker(
  applicationId: string,
  amountKopecks: bigint,
  idempotencyKey: string,
) {
  await getPaymentQueue().add(
    "payment-job",
    {
      type: "refund-seeker",
      applicationId,
      amountKopecks: amountKopecks.toString(),
      idempotencyKey,
    },
    { jobId: `refund-seeker:${applicationId}` },
  );
}

export async function scheduleOfferAcceptedPayout(applicationId: string) {
  const idempotencyKey = `offer-accepted:${applicationId}`;
  await getPaymentQueue().add(
    "payment-job",
    { type: "offer-accepted", applicationId, idempotencyKey },
    { jobId: `offer-accepted:${applicationId}` },
  );
}

// ─────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────

async function processJob(job: Job<PaymentJobData>) {
  const { type, applicationId, amountKopecks, idempotencyKey } = job.data;

  switch (type) {
    case "capture-escrow": {
      if (!applicationId) throw new Error("capture-escrow: missing applicationId");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true },
      });
      if (!app?.escrowTx?.yookassaPaymentId) {
        console.log(`[paymentWorker] capture-escrow: no escrow tx for ${applicationId}, skipping`);
        return;
      }

      await paymentProvider.capturePayment({
        paymentId: app.escrowTx.yookassaPaymentId,
        amountKopecks: app.escrowTx.amountKopecks,
        idempotencyKey,
      });

      await prisma.escrowTransaction.update({
        where: { id: app.escrowTx.id },
        data: { capturedAt: new Date(), status: "CAPTURED" },
      });

      console.log(`[paymentWorker] captured escrow for application ${applicationId}`);
      break;
    }

    case "payout-referrer": {
      if (!applicationId || !amountKopecks) throw new Error("payout-referrer: missing params");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true, vacancy: { select: { referrerId: true } } },
      });
      if (!app) throw new Error(`payout-referrer: application ${applicationId} not found`);

      const dest = await getReferrerPayoutDestination(app.vacancy.referrerId);
      const amount = BigInt(amountKopecks);
      const { netPayout } = calculateCommission(amount);

      const result = await paymentProvider.createPayout({
        idempotencyKey,
        amountKopecks: netPayout,
        description: `Реферальное вознаграждение по заявке ${applicationId}`,
        savedPaymentMethodId: dest,
        metadata: { referrerId: app.vacancy.referrerId, applicationId },
      });

      if (app.escrowTx) {
        await prisma.escrowTransaction.update({
          where: { id: app.escrowTx.id },
          data: { yookassaPayoutId: result.payoutId },
        });
      }

      console.log(`[paymentWorker] payout ${netPayout} kop to referrer for ${applicationId}`);
      break;
    }

    case "refund-seeker": {
      if (!applicationId || !amountKopecks) throw new Error("refund-seeker: missing params");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true },
      });
      if (!app?.escrowTx?.yookassaPaymentId) {
        console.log(`[paymentWorker] refund-seeker: no payment to refund for ${applicationId}`);
        return;
      }

      const res = await paymentProvider.refundPayment({
        paymentId: app.escrowTx.yookassaPaymentId,
        amountKopecks: BigInt(amountKopecks),
        idempotencyKey,
        description: `Возврат по заявке ${applicationId}`,
      });

      await prisma.escrowTransaction.update({
        where: { id: app.escrowTx.id },
        data: { status: "REFUNDED", refundedAt: new Date(), yookassaRefundId: res.refundId },
      });

      console.log(`[paymentWorker] refunded ${amountKopecks} kop for ${applicationId}`);
      break;
    }

    case "offer-accepted": {
      if (!applicationId) throw new Error("offer-accepted: missing applicationId");
      if (!idempotencyKey) throw new Error("offer-accepted: missing idempotencyKey");

      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        include: { escrowTx: true, vacancy: { select: { referrerId: true } } },
      });
      if (!app?.escrowTx?.yookassaPaymentId) {
        console.log(`[paymentWorker] offer-accepted: no escrow for ${applicationId}, skipping`);
        return;
      }

      const { escrowTx, vacancy } = app;
      const eid = escrowTx.id;
      const ykPayId = escrowTx.yookassaPaymentId;
      if (!ykPayId) return;

      if (!escrowTx.capturedAt) {
        await paymentProvider.capturePayment({
          paymentId: ykPayId,
          amountKopecks: escrowTx.amountKopecks,
          idempotencyKey: `${idempotencyKey}:capture`,
        });
        await prisma.escrowTransaction.update({
          where: { id: eid },
          data: { capturedAt: new Date(), status: "CAPTURED" },
        });
      }

      const dest = await getReferrerPayoutDestination(vacancy.referrerId);
      const { netPayout } = calculateCommission(escrowTx.amountKopecks);
      const payout = await paymentProvider.createPayout({
        idempotencyKey: `${idempotencyKey}:payout`,
        amountKopecks: netPayout,
        description: `Реферальное вознаграждение по заявке ${applicationId}`,
        savedPaymentMethodId: dest,
        metadata: { referrerId: vacancy.referrerId, applicationId },
      });
      await prisma.escrowTransaction.update({
        where: { id: eid },
        data: { yookassaPayoutId: payout.payoutId },
      });
      break;
    }

    case "registration-payment-check": {
      if (!job.data.userId || !job.data.yookassaPaymentId) {
        throw new Error("registration-payment-check: missing params");
      }

      const status = await paymentProvider.getPaymentStatus(job.data.yookassaPaymentId);
      if (status === "succeeded") {
        await prisma.gitHubProfile.update({
          where: { userId: job.data.userId },
          data: { paidRegistration: true },
        });
        await prisma.registrationPayment.updateMany({
          where: {
            userId: job.data.userId,
            yookassaPaymentId: job.data.yookassaPaymentId,
          },
          data: { paidAt: new Date() },
        });
      }
      break;
    }

    default:
      console.warn(`[paymentWorker] unknown job type: ${type}`);
  }
}

export function startPaymentWorker() {
  return new Worker<PaymentJobData>("payments", processJob, {
    connection: redis,
    concurrency: 5,
  });
}
