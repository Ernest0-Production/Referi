"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VacancyOwnerActions } from "./VacancyOwnerActions";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  IOS_MOBILE: "iOS",
  ANDROID_MOBILE: "Android",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

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
          {vacancy.status === "ACTIVE" ? "Активна" : "Заморожена"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
          </Badge>
          <Badge variant="secondary">{vacancy.grade}</Badge>
          <Badge variant="secondary">{vacancy.workFormat}</Badge>
        </div>

        <VacancyOwnerActions vacancyId={vacancy.id} />
      </CardContent>
    </Card>
  );
}
