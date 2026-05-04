"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = trpcReact.vacancies.delete.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      setError(err.message);
      setConfirmDelete(false);
    },
  });

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

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/vacancy/applicants">Кандидаты</Link>
          </Button>

          {!confirmDelete ? (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              Удалить вакансию
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Подтвердить?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={del.isPending}
                onClick={() => del.mutate({ id: vacancy.id })}
              >
                {del.isPending ? "Удаление…" : "Да, удалить"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
