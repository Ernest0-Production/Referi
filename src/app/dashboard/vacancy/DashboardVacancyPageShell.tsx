"use client";

import type { ReactNode } from "react";
import { VacancyDashboardFormDirtyProvider } from "./VacancyDashboardFormDirtyContext";

export function DashboardVacancyPageShell({ children }: { children: ReactNode }) {
  return (
    <VacancyDashboardFormDirtyProvider>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">{children}</div>
    </VacancyDashboardFormDirtyProvider>
  );
}
