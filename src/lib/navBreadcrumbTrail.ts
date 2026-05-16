import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

export type NavBreadcrumbSegment = {
  label: string;
  href?: string;
};

const PUBLIC_CATALOG_ROOT = "/";

/**
 * Публичная карточка рефералки: фиксированная иерархия без HTTP Referer
 * (при SPA Referer не отражает «стек» и даёт ложные средние сегменты).
 */
export function publicVacancyDetailTrail(vacancyTitle: string): NavBreadcrumbSegment[] {
  return [{ label: "Рефералки", href: PUBLIC_CATALOG_ROOT }, { label: vacancyTitle }];
}

/**
 * Публичное редактирование карточки: каталог → карточка → «Редактирование».
 */
export function publicVacancyEditTrail(
  vacancyId: string,
  vacancyTitle: string,
): NavBreadcrumbSegment[] {
  return [
    { label: "Рефералки", href: PUBLIC_CATALOG_ROOT },
    { label: vacancyTitle, href: `/vacancies/${vacancyId}` },
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
  return [middle, { label: "Попросить рефералку" }];
}

export function dashboardApplicationDetailTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Мои заявки", href: "/applications" }, { label: "Заявка" }];
}

export function registrationAgeGateTrail(): NavBreadcrumbSegment[] {
  return [{ label: "Вход", href: hrefSignInOverlay("/") }, { label: "Платная регистрация" }];
}
