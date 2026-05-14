"use client";

import { CreateVacancyForm, type EditVacancyFormVacancy } from "./CreateVacancyForm";
import { Card, CardContent } from "@/components/ui/card";

export function EditVacancyCard({ vacancy }: { vacancy: EditVacancyFormVacancy }) {
  return (
    <Card>
      <CardContent>
        <CreateVacancyForm key={vacancy.id} mode="edit" vacancy={vacancy} />
      </CardContent>
    </Card>
  );
}
