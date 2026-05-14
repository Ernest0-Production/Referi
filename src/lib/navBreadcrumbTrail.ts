export type NavBreadcrumbSegment = {
  label: string;
  href?: string;
};

const PUBLIC_CATALOG_ROOT = "/";
const ACCOUNT_VACANCY_BASE = "/vacancy";

/**
 * Публичная карточка рефералки: фиксированная иерархия без HTTP Referer
 * (при SPA Referer не отражает «стек» и даёт ложные средние сегменты).
 */
export function publicVacancyDetailTrail(vacancyTitle: string): NavBreadcrumbSegment[] {
  return [{ label: "Рефералки", href: PUBLIC_CATALOG_ROOT }, { label: vacancyTitle }];
}

/** Экран «Моя рефералка» / «Создание рефералки» — один текущий сегмент; родители приходят из стека навигации. */
export function dashboardVacancyTrail(
  currentTitle: "Моя рефералка" | "Создание рефералки",
): NavBreadcrumbSegment[] {
  return [{ label: currentTitle }];
}

/**
 * Режим правки в кабинете.
 * Публичный контекст — только при **`fromVacancy`** в URL (= id рефералки), см. ссылки с публичной карточки.
 * Иначе: «Моя рефералка» (ссылка на просмотр без правки) → «Редактирование».
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
  return [{ label: "Моя рефералка", href: ACCOUNT_VACANCY_BASE }, { label: "Редактирование" }];
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
  return [middle, { label: "Попросить рефералку" }];
}

export function dashboardApplicationDetailTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Мои заявки", href: "/applications" }, { label: "Заявка" }];
}

export function registrationAgeGateTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Вход", href: "/login" }, { label: "Платная регистрация" }];
}
