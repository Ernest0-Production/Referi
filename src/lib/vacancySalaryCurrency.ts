export const VACANCY_SALARY_CURRENCY_VALUES = ["RUB", "USD", "EUR"] as const;

export type VacancySalaryCurrency = (typeof VACANCY_SALARY_CURRENCY_VALUES)[number];

export const VACANCY_SALARY_CURRENCY_LABELS: Record<VacancySalaryCurrency, string> = {
  RUB: "RUB — руб.",
  USD: "USD — доллар",
  EUR: "EUR — евро",
};

export function isVacancySalaryCurrency(v: string): v is VacancySalaryCurrency {
  return (VACANCY_SALARY_CURRENCY_VALUES as readonly string[]).includes(v);
}

function minorToMajor(amountMinor: string | bigint): number | null {
  const n = typeof amountMinor === "bigint" ? Number(amountMinor) : Number(amountMinor);
  if (!Number.isFinite(n)) return null;
  return Math.round(n / 100);
}

/** Число без символа валюты и сам символ (для диапазонов без дублирования ₽/$/€). */
function formatVacancySalaryMajorAmountAndSymbol(
  major: number,
  currency: VacancySalaryCurrency,
): { amount: string; symbol: string } {
  const parts = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).formatToParts(major);
  let symbol = "";
  const amount = parts
    .filter((p) => {
      if (p.type === "currency") {
        symbol = p.value;
        return false;
      }
      return true;
    })
    .map((p) => p.value)
    .join("")
    .trim();
  return { amount, symbol };
}

export function formatVacancySalaryMinorUnit(
  amountMinor: string | bigint | null | undefined,
  currency: VacancySalaryCurrency,
): string | null {
  if (amountMinor === null || amountMinor === undefined) return null;
  const major = minorToMajor(amountMinor);
  if (major === null) return null;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

export function formatVacancySalaryRange(
  fromMinor: string | null | undefined,
  toMinor: string | null | undefined,
  currency: VacancySalaryCurrency,
): string | null {
  const fromMajor = fromMinor != null && fromMinor !== "" ? minorToMajor(fromMinor) : null;
  const toMajor = toMinor != null && toMinor !== "" ? minorToMajor(toMinor) : null;
  const fromFull = fromMajor !== null ? formatVacancySalaryMinorUnit(fromMinor!, currency) : null;
  const toFull = toMajor !== null ? formatVacancySalaryMinorUnit(toMinor!, currency) : null;
  if (!fromFull && !toFull) return null;
  if (fromMajor !== null && toMajor !== null) {
    const a = formatVacancySalaryMajorAmountAndSymbol(fromMajor, currency);
    const b = formatVacancySalaryMajorAmountAndSymbol(toMajor, currency);
    const symbol = a.symbol || b.symbol;
    return `${a.amount} — ${b.amount}${symbol ? ` ${symbol}` : ""}`;
  }
  if (fromFull) return `от ${fromFull}`;
  return `до ${toFull!}`;
}
