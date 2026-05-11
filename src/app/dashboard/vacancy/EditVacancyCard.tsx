"use client";

import { CreateVacancyForm, type EditVacancyFormVacancy } from "./CreateVacancyForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditVacancyCard({ vacancy }: { vacancy: EditVacancyFormVacancy }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Редактирование рефералки</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateVacancyForm key={vacancy.id} mode="edit" vacancy={vacancy} />
      </CardContent>
    </Card>
  );
}
