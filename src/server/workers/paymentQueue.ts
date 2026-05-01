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
