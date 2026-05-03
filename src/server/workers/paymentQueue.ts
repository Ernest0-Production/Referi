import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export type PaymentJobType =
  | "offer-accepted"
  | "refund-seeker"
  | "registration-payment-check"
  | "refund-paid-token"
  | "subscription-renewal"
  | "subscription-renew-retry";

export interface PaymentJobData {
  type: PaymentJobType;
  applicationId?: string;
  userId?: string;
  yookassaPaymentId?: string;
  amountKopecks?: string;
  idempotencyKey: string;
  tokenId?: string;
  /** Ожидаемый конец оплаченного периода (ms) для сверки с БД */
  periodEndMs?: number;
  /** Номер попытки ретрая после PAST_DUE */
  attempt?: number;
}

let _paymentQueue: Queue<PaymentJobData> | null = null;

export function getPaymentQueue() {
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

export async function cancelPaymentJob(jobId: string): Promise<void> {
  const queue = getPaymentQueue();
  const job = await queue.getJob(jobId);
  if (job) await job.remove();
}

/** Удаляет отложенные subscription-renewal / subscription-renew-retry для пользователя (по полю userId в payload). */
export async function cancelSubscriptionPaymentJobsForUser(userId: string): Promise<void> {
  const queue = getPaymentQueue();
  const jobs = [...(await queue.getWaiting(0, 1000)), ...(await queue.getDelayed(0, 1000))];
  for (const job of jobs) {
    const data = job.data;
    if (!data?.userId || data.userId !== userId) continue;
    if (data.type === "subscription-renewal" || data.type === "subscription-renew-retry") {
      await job.remove();
    }
  }
}
