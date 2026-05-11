/** Цифры целой суммы для отображения и отправки (без разделителей). */
export function sanitizeMoneyIntegerDigits(raw: string, maxDigits = 15): string {
  const d = raw.replace(/\D/g, "").slice(0, maxDigits);
  return d;
}

/** Ограничивает строку цифр сверху целым `maxInteger` (включительно). */
export function clampMoneyIntegerDigits(digits: string, maxInteger: number): string {
  if (!digits) return "";
  try {
    const v = BigInt(digits);
    const m = BigInt(maxInteger);
    if (v <= m) return digits;
    return m.toString();
  } catch {
    return digits;
  }
}

/** Группировка разрядов для ru-RU (узкий пробел между группами по локали). */
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
