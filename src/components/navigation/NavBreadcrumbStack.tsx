"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";
import { mergeBreadcrumbTrails, withCurrentPageHrefRemoved } from "@/lib/navBreadcrumbMerge";

type NavBreadcrumbStackValue = {
  trail: NavBreadcrumbSegment[];
  scheduleBreadcrumbTruncateAfterNavigation: (clickedIndex: number) => void;
  applyForwardSeed: (seed: NavBreadcrumbSegment[]) => void;
  replaceTrailWithSeed: (seed: NavBreadcrumbSegment[]) => void;
};

const NavBreadcrumbStackContext = React.createContext<NavBreadcrumbStackValue | null>(null);

export function useNavBreadcrumbStack(): NavBreadcrumbStackValue {
  const v = React.useContext(NavBreadcrumbStackContext);
  if (!v) {
    throw new Error("useNavBreadcrumbStack: provider отсутствует");
  }
  return v;
}

export function useOptionalNavBreadcrumbStack(): NavBreadcrumbStackValue | null {
  return React.useContext(NavBreadcrumbStackContext);
}

type FlushProps = {
  pendingRef: React.MutableRefObject<number | null>;
  trailRef: React.MutableRefObject<NavBreadcrumbSegment[]>;
  setTrailAndRef: (next: NavBreadcrumbSegment[]) => void;
};

/**
 * Смонтирован последним внутри провайдера: после layout-эффектов страниц
 * применяет отложенное усечение, если ни один BreadcrumbSeedPort не сделал merge.
 */
function BreadcrumbPendingTruncateFlush({ pendingRef, trailRef, setTrailAndRef }: FlushProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = `${pathname}?${searchParams.toString()}`;

  React.useLayoutEffect(() => {
    const pending = pendingRef.current;
    if (pending === null) return;
    pendingRef.current = null;

    const prev = trailRef.current;
    if (pending < 0 || pending >= prev.length) return;

    const sliced = prev.slice(0, pending + 1).map((s, j) => ({
      label: s.label,
      href: j === pending ? undefined : s.href,
    }));
    setTrailAndRef(sliced);
  }, [locationKey, pendingRef, trailRef, setTrailAndRef]);

  return null;
}

export function NavBreadcrumbStackProvider({ children }: { children: React.ReactNode }) {
  const [trail, setTrail] = React.useState<NavBreadcrumbSegment[]>([]);
  const trailRef = React.useRef<NavBreadcrumbSegment[]>([]);
  const pendingBreadcrumbTruncateIndexRef = React.useRef<number | null>(null);

  const setTrailAndRef = React.useCallback((next: NavBreadcrumbSegment[]) => {
    trailRef.current = next;
    setTrail(next);
  }, []);

  const scheduleBreadcrumbTruncateAfterNavigation = React.useCallback((clickedIndex: number) => {
    pendingBreadcrumbTruncateIndexRef.current = clickedIndex;
  }, []);

  const applyForwardSeed = React.useCallback(
    (seed: NavBreadcrumbSegment[]) => {
      if (seed.length === 0) return;

      let base = trailRef.current;
      const pending = pendingBreadcrumbTruncateIndexRef.current;
      pendingBreadcrumbTruncateIndexRef.current = null;
      if (pending !== null && pending >= 0 && pending < base.length) {
        base = base.slice(0, pending + 1).map((s, j) => ({
          label: s.label,
          href: j === pending ? undefined : s.href,
        }));
      }

      const merged = mergeBreadcrumbTrails(base, seed);
      setTrailAndRef(merged);
    },
    [setTrailAndRef],
  );

  const replaceTrailWithSeed = React.useCallback(
    (seed: NavBreadcrumbSegment[]) => {
      if (seed.length === 0) return;
      pendingBreadcrumbTruncateIndexRef.current = null;
      setTrailAndRef(withCurrentPageHrefRemoved([...seed]));
    },
    [setTrailAndRef],
  );

  const value = React.useMemo(
    () => ({
      trail,
      scheduleBreadcrumbTruncateAfterNavigation,
      applyForwardSeed,
      replaceTrailWithSeed,
    }),
    [trail, scheduleBreadcrumbTruncateAfterNavigation, applyForwardSeed, replaceTrailWithSeed],
  );

  return (
    <NavBreadcrumbStackContext.Provider value={value}>
      {children}
      <React.Suspense fallback={null}>
        <BreadcrumbPendingTruncateFlush
          pendingRef={pendingBreadcrumbTruncateIndexRef}
          trailRef={trailRef}
          setTrailAndRef={setTrailAndRef}
        />
      </React.Suspense>
    </NavBreadcrumbStackContext.Provider>
  );
}

export type BreadcrumbSeedPortProps = {
  seed: NavBreadcrumbSegment[];
};

/**
 * Подключает канонический seed текущей страницы к стеку крошек (переход «вперёд»).
 * Рендерится без UI (null).
 */
export function BreadcrumbSeedPort({ seed }: BreadcrumbSeedPortProps) {
  const { applyForwardSeed } = useNavBreadcrumbStack();
  const key = React.useMemo(() => JSON.stringify(seed), [seed]);
  React.useLayoutEffect(() => {
    applyForwardSeed(seed);
  }, [applyForwardSeed, key, seed]);
  return null;
}

/**
 * Для страниц кабинета без собственного BreadcrumbSeedPort: минимальный seed по пути,
 * чтобы при переходе из глубокого стека не тянуть чужие крошки на простые экраны.
 */
export function AccountDefaultBreadcrumbSeed() {
  const pathname = usePathname();
  const { replaceTrailWithSeed } = useNavBreadcrumbStack();

  React.useLayoutEffect(() => {
    if (pathname.startsWith("/vacancy")) return;
    if (pathname.startsWith("/applications/new")) return;
    if (/^\/applications\/[^/]+$/.test(pathname)) return;

    if (pathname === "/settings") {
      replaceTrailWithSeed([{ label: "Настройки" }]);
      return;
    }
    if (pathname === "/profile") {
      replaceTrailWithSeed([{ label: "Профиль" }]);
      return;
    }
    if (pathname === "/attempts") {
      replaceTrailWithSeed([{ label: "Попытки" }]);
      return;
    }
    if (pathname === "/applications") {
      replaceTrailWithSeed([{ label: "Мои заявки" }]);
    }
  }, [pathname, replaceTrailWithSeed]);

  return null;
}
