import { randomUUID } from "crypto";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { getPaymentQueue } from "@/server/workers/paymentQueue";

export async function scheduleSubscriptionRenewal(userId: string, periodEnd: Date) {
  const delay = Math.max(0, periodEnd.getTime() - Date.now());
  const periodEndMs = periodEnd.getTime();
  await getPaymentQueue().add(
    "payment-job",
    {
      type: "subscription-renewal",
      userId,
      periodEndMs,
      idempotencyKey: randomUUID(),
    },
    {
      jobId: `subscription-renew:${userId}:${periodEndMs}`,
      delay,
    },
  );
}

export async function scheduleSubscriptionRenewRetry(userId: string, attempt: number) {
  if (attempt > BUSINESS_RULES.SUBSCRIPTION_RETRY_MAX_ATTEMPTS) return;
  await getPaymentQueue().add(
    "payment-job",
    {
      type: "subscription-renew-retry",
      userId,
      attempt,
      idempotencyKey: randomUUID(),
    },
    {
      jobId: `subscription-retry:${userId}:${attempt}:${randomUUID()}`,
      delay: BUSINESS_RULES.SUBSCRIPTION_RETRY_DELAY_MS,
    },
  );
}
