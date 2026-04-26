import { BUSINESS_RULES } from "@/shared/constants/businessRules";

/**
 * Calculate platform commission and net payout for a given escrow amount.
 * Commission rounds down (in favor of the referrer).
 */
export function calculateCommission(amountKopecks: bigint): {
  commission: bigint;
  netPayout: bigint;
} {
  const RATE = BigInt(Math.round(BUSINESS_RULES.PLATFORM_COMMISSION_RATE * 10_000));
  const commission = (amountKopecks * RATE) / BigInt(10_000);
  const netPayout = amountKopecks - commission;
  return { commission, netPayout };
}

/**
 * Format kopecks as a human-readable ruble string.
 * Example: 10000n → "100 ₽"
 */
export function formatRubles(kopecks: bigint): string {
  const rubles = Number(kopecks) / 100;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rubles);
}

/**
 * Convert BigInt kopecks to string for JSON serialization.
 * Use in tRPC router outputs.
 */
export function kopecksToString(kopecks: bigint | null | undefined): string | null {
  if (kopecks == null) return null;
  return kopecks.toString();
}
