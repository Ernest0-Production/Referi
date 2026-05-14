const VACANCY_CATALOG_SCROLL_SESSION_KEY = "referi:vacancyCatalog:scrollY";

export function rememberVacancyCatalogScrollPosition(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VACANCY_CATALOG_SCROLL_SESSION_KEY, String(window.scrollY));
  } catch {
    /* sessionStorage недоступен */
  }
}

export function consumeVacancyCatalogScrollPosition(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VACANCY_CATALOG_SCROLL_SESSION_KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(VACANCY_CATALOG_SCROLL_SESSION_KEY);
    const y = Number(raw);
    return Number.isFinite(y) && y >= 0 ? y : null;
  } catch {
    return null;
  }
}
