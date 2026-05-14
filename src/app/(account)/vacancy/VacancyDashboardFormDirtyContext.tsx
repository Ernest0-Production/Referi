"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type VacancyDashboardFormDirtyContextValue = {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
};

const VacancyDashboardFormDirtyContext =
  createContext<VacancyDashboardFormDirtyContextValue | null>(null);

export function VacancyDashboardFormDirtyProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirtyState] = useState(false);
  const setDirty = useCallback((v: boolean) => {
    setDirtyState(v);
  }, []);
  const value = useMemo(() => ({ dirty, setDirty }), [dirty, setDirty]);
  return (
    <VacancyDashboardFormDirtyContext.Provider value={value}>
      {children}
    </VacancyDashboardFormDirtyContext.Provider>
  );
}

export function useVacancyDashboardFormDirtyContext(): VacancyDashboardFormDirtyContextValue | null {
  return useContext(VacancyDashboardFormDirtyContext);
}

export function useReportVacancyDashboardFormDirty(): ((dirty: boolean) => void) | undefined {
  return useContext(VacancyDashboardFormDirtyContext)?.setDirty;
}
