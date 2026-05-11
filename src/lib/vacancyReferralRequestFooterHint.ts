/** Текст под CTA «Попросить рефералку» на `/vacancies/[id]` (ru-RU). */
export function formatVacancyReferralRequestFooterHint(count: number): string {
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return "Ты будешь первым!";

  const num = new Intl.NumberFormat("ru-RU").format(n);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let people: string;
  if (mod100 >= 11 && mod100 <= 14) {
    people = "человек";
  } else if (mod10 === 1) {
    people = "человек";
  } else if (mod10 >= 2 && mod10 <= 4) {
    people = "человека";
  } else {
    people = "человек";
  }

  const verb = n === 1 ? "запросил" : "запросили";
  return `${num} ${people} уже ${verb} рефералку`;
}
