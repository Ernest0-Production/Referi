export type NavBreadcrumbSegment = {
  label: string;
  href?: string;
};

const DASHBOARD_ROOT = "/dashboard";
const PUBLIC_CATALOG_ROOT = "/";
const DASHBOARD_VACANCY_BASE = "/dashboard/vacancy";

/**
 * Публичная карточка рефералки: фиксированная иерархия без HTTP Referer
 * (при SPA Referer не отражает «стек» и даёт ложные средние сегменты).
 */
export function publicVacancyDetailTrail(vacancyTitle: string): NavBreadcrumbSegment[] {
  return [{ label: "Рефералки", href: PUBLIC_CATALOG_ROOT }, { label: vacancyTitle }];
}

/** Кабинет: экран «Моя рефералка» или «Создание рефералки» — только маршрут, без Referer. */
export function dashboardVacancyTrail(
  currentTitle: "Моя рефералка" | "Создание рефералки",
): NavBreadcrumbSegment[] {
  return [{ label: "Кабинет", href: DASHBOARD_ROOT }, { label: currentTitle }];
}

/**
 * Режим правки в кабинете.
 * Публичный контекст — только при **`fromVacancy`** в URL (= id рефералки), см. ссылки с публичной карточки.
 * Иначе цепочка кабинета: Просмотр → та же страница без `edit`.
 */
export function dashboardVacancyEditTrail(
  vacancyId: string,
  vacancyTitle: string,
  openedFromPublicVacancyDetail: boolean,
): NavBreadcrumbSegment[] {
  const publicDetailPn = `/vacancies/${vacancyId}`;
  if (openedFromPublicVacancyDetail) {
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

/** Новая заявка: «каталожный» контекст только при `fromVacancy=vacancyId` в query. */
export function dashboardApplicationNewTrail(
  vacancyId: string,
  vacancyTitle: string,
  openedFromPublicVacancyDetail: boolean,
): NavBreadcrumbSegment[] {
  const publicDetailPn = `/vacancies/${vacancyId}`;
  const middle = { label: vacancyTitle, href: publicDetailPn };
  if (openedFromPublicVacancyDetail) {
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
