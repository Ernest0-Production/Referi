/** Отображение суммы в рублях из копеек (как в `BUSINESS_RULES.*_KOP`). */
export function formatRubFromKopecks(kopecks: bigint): string {
  const rub = Number(kopecks) / 100;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(rub)}\u00a0₽`;
}
