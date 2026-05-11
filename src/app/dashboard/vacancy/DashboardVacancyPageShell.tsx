"use client";

import type { ReactNode } from "react";
import { DashboardVacancyBackButton } from "./DashboardVacancyBackButton";
import { VacancyDashboardFormDirtyProvider } from "./VacancyDashboardFormDirtyContext";

export function DashboardVacancyPageShell({
  backLabel,
  hideBack,
  children,
}: {
  backLabel: string;
  hideBack?: boolean;
  children: ReactNode;
}) {
  return (
    <VacancyDashboardFormDirtyProvider>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
        {!hideBack ? <DashboardVacancyBackButton label={backLabel} /> : null}
        {children}
      </div>
    </VacancyDashboardFormDirtyProvider>
  );
}
