/**
 * Start BullMQ workers once per Node.js process (not during CI, build, or Edge).
 * Set ENABLE_BULLMQ_WORKERS=false to disable. Set to true in Docker/production
 * when NODE_ENV=production so workers run outside next dev.
 */

const globalWorkers = globalThis as unknown as {
  __referiBullmqWorkers?: { close: () => Promise<void> }[];
};

function shouldStartWorkers(): boolean {
  if (process.env.NEXT_RUNTIME !== "nodejs") return false;
  if (process.env.CI === "true") return false;
  if (process.env.ENABLE_BULLMQ_WORKERS === "false") return false;
  if (process.env.ENABLE_BULLMQ_WORKERS === "true") return true;
  return process.env.NODE_ENV === "development";
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
