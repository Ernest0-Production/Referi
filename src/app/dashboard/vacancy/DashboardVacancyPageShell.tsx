"use client";

import type { ReactNode } from "react";
import { PAGE_COLUMN_MAX_W3_CLASS } from "@/lib/pageContentShell";
import { VacancyDashboardFormDirtyProvider } from "./VacancyDashboardFormDirtyContext";

export function DashboardVacancyPageShell({ children }: { children: ReactNode }) {
  return (
    <VacancyDashboardFormDirtyProvider>
      <div className={PAGE_COLUMN_MAX_W3_CLASS}>{children}</div>
    </VacancyDashboardFormDirtyProvider>
  );
}
