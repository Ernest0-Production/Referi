/** Число и подпись «N отклик(ов)» по рефералке для ru-RU. */
export function formatApplicationCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count));
  const num = new Intl.NumberFormat("ru-RU").format(n);
  let word: string;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    word = "отклик";
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    word = "отклика";
  } else {
    word = "откликов";
  }
  return `${num} ${word}`;
}
