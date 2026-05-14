"use client";

import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { useVacancyDashboardFormDirtyContext } from "./VacancyDashboardFormDirtyContext";

export function DashboardVacancyNav() {
  const dirty = useVacancyDashboardFormDirtyContext()?.dirty ?? false;

  return (
    <AppNavBreadcrumb
      leaveGuard={dirty}
      leaveDialogTitle="Отменить изменения?"
      leaveDialogDescription="Есть несохранённые правки. Выйти без сохранения?"
    />
  );
}
