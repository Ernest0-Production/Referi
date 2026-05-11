"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeIcon, SpecialtyIcon, WorkFormatIcon } from "@/components/vacancy/VacancyFieldIcons";
import { VacancyOwnerActions } from "./VacancyOwnerActions";
import { ru } from "@/locales";

const SL = ru.vacancies.specialtyLabels;
const GL = ru.vacancies.gradeLabels;
const WF = ru.vacancies.workFormatLabels;
const V = ru.dashboard.vacancy;

interface Vacancy {
  id: string;
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  status: string;
  salaryFromKopecks: string | null;
  salaryToKopecks: string | null;
  rewardKopecks: string;
}

export function ManageVacancyPanel({ vacancy }: { vacancy: Vacancy }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg">{vacancy.title}</CardTitle>
          <p className="text-muted-foreground text-sm">{vacancy.companyName}</p>
        </div>
        <Badge variant={vacancy.status === "ACTIVE" ? "default" : "secondary"}>
          {vacancy.status === "ACTIVE" ? V.panelActive : V.panelFrozen}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <SpecialtyIcon specialty={vacancy.specialty} className="text-current" />
            {SL[vacancy.specialty as keyof typeof SL] ?? vacancy.specialty}
          </Badge>
          <Badge variant="secondary">
            <GradeIcon className="text-current" />
            {GL[vacancy.grade as keyof typeof GL] ?? vacancy.grade}
          </Badge>
          <Badge variant="secondary">
            <WorkFormatIcon format={vacancy.workFormat} className="text-current" />
            {WF[vacancy.workFormat as keyof typeof WF] ?? vacancy.workFormat}
          </Badge>
        </div>

        <VacancyOwnerActions vacancyId={vacancy.id} />
      </CardContent>
    </Card>
  );
}
