export const VACANCY_VIEWED_COOKIE = "referi_vacancy_viewed";
export const VACANCY_VIEWED_MAX = 200;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseVacancyViewedCookie(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v !== "string") continue;
      const id = v.trim();
      if (!UUID_RE.test(id)) continue;
      out.push(id);
      if (out.length >= VACANCY_VIEWED_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function readVacancyViewedIdsFromCookies(cookieStore: {
  get(name: string): { value: string } | undefined;
}): string[] {
  return parseVacancyViewedCookie(cookieStore.get(VACANCY_VIEWED_COOKIE)?.value);
}
