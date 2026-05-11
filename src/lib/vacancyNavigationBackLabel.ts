import { headers } from "next/headers";

type VacancyBackLabelContext = "dashboardVacancy" | "vacancyCatalogDetail";

/** Pathname + search из Referer того же origin, иначе `null`. */
export async function sameOriginRefererPathname(): Promise<string | null> {
  const h = await headers();
  const ref = h.get("referer");
  if (!ref) return null;
  try {
    const u = new URL(ref);
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host || u.host !== host) return null;
    return `${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

function pathnameOnly(pathnameWithSearch: string | null): string {
  if (!pathnameWithSearch) return "/";
  return pathnameWithSearch.split("?")[0] || "/";
}

function vacancyBackLabelFromRefererPath(
  pathnameWithSearch: string | null,
  context: VacancyBackLabelContext,
  currentVacancyDetailPath?: string,
): string {
  if (!pathnameWithSearch) {
    return context === "dashboardVacancy" ? "Обзор" : "Все рефералки";
  }

  const pathname = pathnameOnly(pathnameWithSearch);

  if (
    context === "vacancyCatalogDetail" &&
    currentVacancyDetailPath &&
    pathname === currentVacancyDetailPath
  ) {
    return "Все рефералки";
  }

  if (pathname === "/dashboard/vacancy" || pathname.startsWith("/dashboard/vacancy/")) {
    return context === "dashboardVacancy" ? "Обзор" : "Моя рефералка";
  }

  if (pathname.startsWith("/dashboard/applications/new")) {
    return "Попросить рефералку";
  }
  if (pathname.startsWith("/dashboard/applications")) {
    return "Мои заявки";
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return "Настройки аккаунта";
  }
  if (pathname.startsWith("/dashboard/attempts")) {
    return "Пул попыток";
  }
  if (pathname.startsWith("/dashboard/profile")) {
    return "Профиль";
  }
  if (pathname.startsWith("/dashboard")) {
    return "Обзор";
  }
  if (pathname.startsWith("/vacancies/") && pathname !== "/vacancies/new") {
    return "Рефералка";
  }
  if (pathname.startsWith("/vacancies/new")) {
    return "Разместить рефералку";
  }
  if (pathname === "/") {
    return "Все рефералки";
  }
  if (pathname.startsWith("/login")) {
    return "Вход";
  }
  if (pathname.startsWith("/registration")) {
    return "Регистрация";
  }
  if (pathname.startsWith("/admin")) {
    return "Админка";
  }
  if (pathname.startsWith("/pay/")) {
    return "Оплата";
  }

  return context === "dashboardVacancy" ? "Обзор" : "Все рефералки";
}

/**
 * Подпись кнопки «назад» на `/dashboard/vacancy` (без «← »).
 */
export function vacancyDashboardBackLabelFromPathname(pathnameWithSearch: string | null): string {
  return vacancyBackLabelFromRefererPath(pathnameWithSearch, "dashboardVacancy");
}

/**
 * Подпись кнопки «назад» на `/vacancies/[id]` (без «← »).
 */
export function vacancyCatalogDetailBackLabelFromPathname(
  pathnameWithSearch: string | null,
  vacancyId: string,
): string {
  return vacancyBackLabelFromRefererPath(
    pathnameWithSearch,
    "vacancyCatalogDetail",
    `/vacancies/${vacancyId}`,
  );
}

/**
 * Подпись «назад» с экрана редактирования: с `/dashboard/vacancy` — «Просмотр», иначе как у верхней кнопки кабинета.
 */
export function vacancyDashboardEditBackLabelFromPathname(
  pathnameWithSearch: string | null,
): string {
  if (!pathnameWithSearch) return "Просмотр";
  const pathname = pathnameOnly(pathnameWithSearch);
  if (pathname === "/dashboard/vacancy" || pathname.startsWith("/dashboard/vacancy/")) {
    return "Просмотр";
  }
  return vacancyDashboardBackLabelFromPathname(pathnameWithSearch);
}
