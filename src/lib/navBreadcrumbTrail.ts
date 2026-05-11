import {
  vacancyCatalogDetailBackLabelFromPathname,
  vacancyDashboardBackLabelFromPathname,
} from "@/lib/vacancyNavigationBackLabel";

export type NavBreadcrumbSegment = {
  label: string;
  href?: string;
};

const DASHBOARD_ROOT = "/dashboard";
const PUBLIC_CATALOG_ROOT = "/";
const DASHBOARD_VACANCY_BASE = "/dashboard/vacancy";

export function pathnameFromPathAndSearch(pathnameWithSearch: string | null): string {
  if (!pathnameWithSearch) return "/";
  const raw = pathnameWithSearch.split("?")[0] || "/";
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1) || "/";
  }
  return raw;
}

/** Referer — страница новой заявки по этой же рефералке (не добавлять её в крошки карточки). */
function refererIsApplicationNewForVacancy(refererPath: string, vacancyId: string): boolean {
  const pn = pathnameFromPathAndSearch(refererPath);
  if (pn !== "/dashboard/applications/new") return false;
  const qIndex = refererPath.indexOf("?");
  if (qIndex === -1) return false;
  const params = new URLSearchParams(refererPath.slice(qIndex + 1));
  return params.get("vacancyId") === vacancyId;
}

/** Публичная карточка рефералки: каталог → (предыдущая страница) → заголовок. */
export function publicVacancyDetailTrail(
  refererPath: string | null,
  vacancyId: string,
  vacancyTitle: string,
): NavBreadcrumbSegment[] {
  const items: NavBreadcrumbSegment[] = [{ label: "Рефералки", href: PUBLIC_CATALOG_ROOT }];
  const rp = pathnameFromPathAndSearch(refererPath);
  const selfPn = `/vacancies/${vacancyId}`;
  if (
    refererPath &&
    rp !== pathnameFromPathAndSearch(PUBLIC_CATALOG_ROOT) &&
    rp !== selfPn &&
    !refererIsApplicationNewForVacancy(refererPath, vacancyId)
  ) {
    items.push({
      label: vacancyCatalogDetailBackLabelFromPathname(refererPath, vacancyId),
      href: refererPath,
    });
  }
  items.push({ label: vacancyTitle });
  return items;
}

/** Кабинет: рефералка / создание (без режима правки). */
export function dashboardVacancyTrail(
  refererPath: string | null,
  currentTitle: "Моя рефералка" | "Создание рефералки",
): NavBreadcrumbSegment[] {
  const items: NavBreadcrumbSegment[] = [{ label: "Кабинет", href: DASHBOARD_ROOT }];
  const rp = pathnameFromPathAndSearch(refererPath);
  const selfPn = pathnameFromPathAndSearch(DASHBOARD_VACANCY_BASE);
  const dashboardRootPn = pathnameFromPathAndSearch(DASHBOARD_ROOT);
  if (refererPath && rp !== selfPn && !rp.startsWith(`${selfPn}/`) && rp !== dashboardRootPn) {
    items.push({
      label: vacancyDashboardBackLabelFromPathname(refererPath),
      href: refererPath,
    });
  }
  items.push({ label: currentTitle });
  return items;
}

/**
 * Режим правки рефералки в кабинете.
 * Цепочка **Рефералки → название → Редактирование**, если переход зафиксирован как с публичной
 * карточки (`fromVacancy` в query совпадает с id) **или** `Referer` указывает на `/vacancies/:id`
 * той же рефералки. Иначе — **Кабинет → Просмотр → Редактирование** (вход из кабинета).
 */
export function dashboardVacancyEditTrail(
  refererPath: string | null,
  vacancyId: string,
  vacancyTitle: string,
  openedFromPublicVacancyDetail: boolean,
): NavBreadcrumbSegment[] {
  const rp = pathnameFromPathAndSearch(refererPath);
  const publicDetailPn = `/vacancies/${vacancyId}`;
  const usePublicTrail = openedFromPublicVacancyDetail || rp === publicDetailPn;

  if (usePublicTrail) {
    return [
      { label: "Рефералки", href: PUBLIC_CATALOG_ROOT },
      { label: vacancyTitle, href: publicDetailPn },
      { label: "Редактирование" },
    ];
  }

  return [
    { label: "Кабинет", href: DASHBOARD_ROOT },
    { label: "Просмотр", href: DASHBOARD_VACANCY_BASE },
    { label: "Редактирование" },
  ];
}

export function newPublicVacancyTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Рефералки", href: PUBLIC_CATALOG_ROOT }, { label: "Разместить рефералку" }];
}

export function dashboardApplicationNewTrail(
  refererPath: string | null,
  vacancyId: string,
  vacancyTitle: string,
  openedFromPublicVacancyDetail: boolean,
): NavBreadcrumbSegment[] {
  const rp = pathnameFromPathAndSearch(refererPath);
  const publicDetailPn = `/vacancies/${vacancyId}`;
  const usePublicTrail = openedFromPublicVacancyDetail || rp === publicDetailPn;
  const middle = { label: vacancyTitle, href: publicDetailPn };

  if (usePublicTrail) {
    return [
      { label: "Рефералки", href: PUBLIC_CATALOG_ROOT },
      middle,
      { label: "Попросить рефералку" },
    ];
  }

  return [{ label: "Кабинет", href: DASHBOARD_ROOT }, middle, { label: "Попросить рефералку" }];
}

export function dashboardApplicationDetailTrail(): NavBreadcrumbSegment[] {
  return [
    { label: "Кабинет", href: DASHBOARD_ROOT },
    { label: "Мои заявки", href: "/dashboard/applications" },
    { label: "Заявка" },
  ];
}

export function registrationAgeGateTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Вход", href: "/login" }, { label: "Платная регистрация" }];
}
