"use client";

import { useState } from "react";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";
import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { publicVacancyEditTrail } from "@/lib/navBreadcrumbTrail";
import { CreateVacancyForm, type EditVacancyFormVacancy } from "@/app/vacancies/CreateVacancyForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function VacancyEditCompose({ vacancy }: { vacancy: EditVacancyFormVacancy }) {
  const [dirty, setDirty] = useState(false);
  const trail = publicVacancyEditTrail(vacancy.id, vacancy.title);

  return (
    <div className="flex flex-col gap-4">
      <BreadcrumbSeedPort seed={trail} />
      <AppNavBreadcrumb
        leaveGuard={dirty}
        leaveDialogTitle="Выйти без сохранения?"
        leaveDialogDescription="Есть несохранённые правки. Выйти из редактирования?"
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">Редактирование вакансии</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{vacancy.title}</CardTitle>
          <CardDescription>
            Внеси изменения в полях ниже и нажми «Сохранить изменения».
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CreateVacancyForm mode="edit" vacancy={vacancy} onDirtyChange={setDirty} />
        </CardContent>
      </Card>
    </div>
  );
}
