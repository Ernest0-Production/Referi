import { headers } from "next/headers";
import { ru } from "@/locales";

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
  const b = ru.site.vacancyBack;

  if (!pathnameWithSearch) {
    return context === "dashboardVacancy" ? b.dashboardDefault : b.catalogDefault;
  }

  const pathname = pathnameOnly(pathnameWithSearch);

  if (
    context === "vacancyCatalogDetail" &&
    currentVacancyDetailPath &&
    pathname === currentVacancyDetailPath
  ) {
    return b.allVacancies;
  }

  if (pathname === "/dashboard/vacancy" || pathname.startsWith("/dashboard/vacancy/")) {
    return context === "dashboardVacancy" ? b.dashboardDefault : b.myVacancy;
  }

  if (pathname.startsWith("/dashboard/applications/new")) {
    return b.requestVacancy;
  }
  if (pathname.startsWith("/dashboard/applications")) {
    return b.myApplications;
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return b.accountSettings;
  }
  if (pathname.startsWith("/dashboard/attempts")) {
    return b.attemptsPool;
  }
  if (pathname.startsWith("/dashboard/profile")) {
    return b.profile;
  }
  if (pathname.startsWith("/dashboard")) {
    return b.dashboardHome;
  }
  if (pathname.startsWith("/vacancies/") && pathname !== "/vacancies/new") {
    return b.vacancySingular;
  }
  if (pathname.startsWith("/vacancies/new")) {
    return b.newVacancy;
  }
  if (pathname === "/") {
    return b.allVacancies;
  }
  if (pathname.startsWith("/login")) {
    return b.login;
  }
  if (pathname.startsWith("/registration")) {
    return b.registration;
  }
  if (pathname.startsWith("/admin")) {
    return b.admin;
  }
  if (pathname.startsWith("/pay/")) {
    return b.payment;
  }

  return context === "dashboardVacancy" ? b.dashboardDefault : b.catalogDefault;
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
  const b = ru.site.vacancyBack;
  if (!pathnameWithSearch) return b.editPreview;
  const pathname = pathnameOnly(pathnameWithSearch);
  if (pathname === "/dashboard/vacancy" || pathname.startsWith("/dashboard/vacancy/")) {
    return b.editPreview;
  }
  return vacancyDashboardBackLabelFromPathname(pathnameWithSearch);
}
