"use client";

import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";
import { useVacancyDashboardFormDirtyContext } from "./VacancyDashboardFormDirtyContext";

export function DashboardVacancyNav({ segments }: { segments: NavBreadcrumbSegment[] }) {
  const dirty = useVacancyDashboardFormDirtyContext()?.dirty ?? false;

  return (
    <AppNavBreadcrumb
      segments={segments}
      leaveGuard={dirty}
      leaveDialogTitle="Отменить изменения?"
      leaveDialogDescription="Есть несохранённые правки. Выйти без сохранения?"
    />
  );
}
