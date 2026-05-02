/**
 * Start BullMQ workers once per Node.js process (not during CI, build, or Edge).
 * `ENABLE_BULLMQ_WORKERS` must be `"true"` or `"false"` in environment (see `src/env.ts`).
 */

import { env } from "@/env";

const globalWorkers = globalThis as unknown as {
  __referiBullmqWorkers?: { close: () => Promise<void> }[];
};

function shouldStartWorkers(): boolean {
  if (process.env.NEXT_RUNTIME !== "nodejs") return false;
  if (process.env.CI === "true") return false;
  return env.ENABLE_BULLMQ_WORKERS === "true";
}

export async function register() {
  if (!shouldStartWorkers()) return;
  if (globalWorkers.__referiBullmqWorkers?.length) return;

  const [{ startSLAWorker }, { startPaymentWorker }] = await Promise.all([
    import("@/server/workers/slaWorker"),
    import("@/server/workers/paymentWorker"),
  ]);

  const sla = startSLAWorker();
  const payments = startPaymentWorker();
  globalWorkers.__referiBullmqWorkers = [sla, payments];
}
