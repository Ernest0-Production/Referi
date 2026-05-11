"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { CreateVacancyForm } from "@/app/dashboard/vacancy/CreateVacancyForm";
import { clearVacancyCreateDraft } from "@/lib/vacancyCreateDraftStorage";
import { newPublicVacancyTrail } from "@/lib/navBreadcrumbTrail";
import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type NewVacancyComposeWithBackProps = {
  title: string;
  subtitle?: string | null;
  cardDescription?: string | null;
} & ({ showForm: true } | { showForm: false; emptyState: ReactNode });

export function NewVacancyComposeWithBack(props: NewVacancyComposeWithBackProps) {
  const [dirty, setDirty] = useState(false);
  const { title, subtitle, cardDescription, showForm } = props;
  const leaveGuard = Boolean(showForm && dirty);

  return (
    <div className="flex flex-col gap-4">
      <AppNavBreadcrumb
        segments={newPublicVacancyTrail()}
        leaveGuard={leaveGuard}
        leaveDialogTitle="Выйти без сохранения?"
        leaveDialogDescription="Есть несохранённые данные. Вернуться в каталог без публикации?"
        onBeforeNavigate={clearVacancyCreateDraft}
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Новая рефералка</CardTitle>
            {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <CreateVacancyForm onDirtyChange={setDirty} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Новая рефералка</CardTitle>
            {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">{props.emptyState}</CardContent>
        </Card>
      )}
    </div>
  );
}
