import { ru } from "@/locales";

/** Текст под CTA «Попросить рефералку» на `/vacancies/[id]` (ru-RU). */
export function formatVacancyReferralRequestFooterHint(count: number): string {
  const t = ru.vacancies.referralFooter;
  const n = Math.max(0, Math.floor(count));
  if (n === 0) return t.first;

  const num = new Intl.NumberFormat("ru-RU").format(n);
  const mod10 = n % 10;
  const mod100 = n % 100;
  let people: string;
  if (mod100 >= 11 && mod100 <= 14) {
    people = t.peopleMany;
  } else if (mod10 === 1) {
    people = t.peopleMany;
  } else if (mod10 >= 2 && mod10 <= 4) {
    people = t.peopleFew;
  } else {
    people = t.peopleMany;
  }

  const verb = n === 1 ? t.verbOne : t.verbMany;
  return t.line(num, people, verb);
}
