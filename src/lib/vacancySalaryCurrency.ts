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

export function formatVacancySalaryMinorUnit(
  amountMinor: string | bigint | null | undefined,
  currency: VacancySalaryCurrency,
): string | null {
  if (amountMinor === null || amountMinor === undefined) return null;
  const n = typeof amountMinor === "bigint" ? Number(amountMinor) : Number(amountMinor);
  if (!Number.isFinite(n)) return null;
  const major = Math.round(n / 100);
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
  const from = fromMinor ? formatVacancySalaryMinorUnit(fromMinor, currency) : null;
  const to = toMinor ? formatVacancySalaryMinorUnit(toMinor, currency) : null;
  if (!from && !to) return null;
  if (from && to) return `${from} — ${to}`;
  if (from) return `от ${from}`;
  return `до ${to!}`;
}
