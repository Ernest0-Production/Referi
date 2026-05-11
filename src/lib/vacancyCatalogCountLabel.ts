import { ru } from "@/locales";

/** Число и подпись «N рефералк(а/и/ок)» в каталоге для ru-RU. */
export function formatVacancyCatalogCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  const num = new Intl.NumberFormat("ru-RU").format(n);
  const mod10 = n % 10;
  const mod100 = n % 100;
  const { vacancyOne, vacancyFew, vacancyMany } = ru.vacancies.count;
  let word: string;
  if (mod10 === 1 && mod100 !== 11) {
    word = vacancyOne;
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = vacancyFew;
  } else {
    word = vacancyMany;
  }
  return `${num} ${word}`;
}
