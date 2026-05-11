/** Digits of a whole amount for display and submit (no separators). */
export function sanitizeMoneyIntegerDigits(raw: string, maxDigits = 15): string {
  const d = raw.replace(/\D/g, "").slice(0, maxDigits);
  return d;
}

/** Digit grouping for ru-RU (narrow space between groups per locale). */
export function formatRuMoneyIntegerDisplay(digits: string): string {
  if (!digits) return "";
  try {
    return BigInt(digits).toLocaleString("ru-RU");
  } catch {
    return digits;
  }
}

export function parseMoneyIntegerDigitsToNumber(digits: string): number | null {
  if (!digits) return null;
  try {
    const n = Number(BigInt(digits));
    if (!Number.isFinite(n)) return null;
    return n;
  } catch {
    return null;
  }
}
