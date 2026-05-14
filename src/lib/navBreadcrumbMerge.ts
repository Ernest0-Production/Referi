import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";

function sameSegment(a: NavBreadcrumbSegment, b: NavBreadcrumbSegment): boolean {
  return a.label === b.label && (a.href ?? "") === (b.href ?? "");
}

/**
 * Последний сегмент — текущая страница: без href (не кликабелен).
 */
export function withCurrentPageHrefRemoved(trail: NavBreadcrumbSegment[]): NavBreadcrumbSegment[] {
  if (trail.length === 0) return trail;
  return trail.map((s, idx) =>
    idx === trail.length - 1 ? { label: s.label } : { label: s.label, href: s.href },
  );
}

/**
 * Слияние при переходе «вперёд» (Link, router.push, не клик по крошке).
 * Общий префикс prev и seed по парам сегментов; хвост берём из seed.
 */
export function mergeBreadcrumbTrails(
  prev: NavBreadcrumbSegment[],
  seed: NavBreadcrumbSegment[],
): NavBreadcrumbSegment[] {
  if (seed.length === 0) return prev;
  if (prev.length === 0) {
    return withCurrentPageHrefRemoved([...seed]);
  }

  let j = 0;
  const max = Math.min(prev.length, seed.length);
  while (j < max && sameSegment(prev[j]!, seed[j]!)) {
    j++;
  }

  if (j === 0 && prev.length > 0 && seed.length === 1) {
    return withCurrentPageHrefRemoved([...prev, ...seed]);
  }

  if (j === seed.length) {
    return withCurrentPageHrefRemoved(
      seed.map((s, idx) => ({
        label: s.label,
        href: idx === seed.length - 1 ? undefined : s.href,
      })),
    );
  }

  const merged = [...prev.slice(0, j), ...seed.slice(j)];
  return withCurrentPageHrefRemoved(merged);
}
