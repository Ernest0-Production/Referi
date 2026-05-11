import { ru } from "@/locales";

/** Число и подпись «N отклик(ов)» по рефералке для ru-RU. */
export function formatApplicationCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  const num = new Intl.NumberFormat("ru-RU").format(n);
  let word: string;
  const mod10 = n % 10;
  const mod100 = n % 100;
  const { one, few, many } = ru.vacancies.applicationCount;
  if (mod10 === 1 && mod100 !== 11) {
    word = one;
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = few;
  } else {
    word = many;
  }
  return `${num} ${word}`;
}
