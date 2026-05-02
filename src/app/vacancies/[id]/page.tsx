import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { trpc } from "@/trpc/server";
import { ReportVacancyForm } from "./ReportVacancyForm";
import { VacancyViewCookieWriter } from "../VacancyViewCookieWriter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  MOBILE: "Mobile",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<string, string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VacancyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  let vacancy;
  try {
    vacancy = await trpc.vacancies.getById({ id });
  } catch {
    notFound();
  }

  const salaryFrom = vacancy.salaryFromKopecks
    ? Math.round(Number(vacancy.salaryFromKopecks) / 100)
    : null;
  const salaryTo = vacancy.salaryToKopecks
    ? Math.round(Number(vacancy.salaryToKopecks) / 100)
    : null;
  const reward = Math.round(Number(vacancy.rewardKopecks) / 100);

  const fmt = (v: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <main className="min-h-screen bg-[var(--app-page-surface)]">
      <VacancyViewCookieWriter vacancyId={id} />
      <PublicHeaderNav session={session} />

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/">← Все вакансии</Link>
        </Button>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">{vacancy.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{vacancy.companyName}</p>
            </div>
            {reward > 0 ? (
              <Badge variant="secondary" className="shrink-0 text-sm font-medium">
                Бонус: {fmt(reward)}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}</Badge>
              <Badge variant="secondary">{GRADE_LABELS[vacancy.grade] ?? vacancy.grade}</Badge>
              <Badge variant="secondary">{FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}</Badge>
            </div>

            {salaryFrom || salaryTo ? (
              <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
                <p className="text-sm text-muted-foreground">Зарплата</p>
                <p className="font-semibold text-foreground">
                  {salaryFrom && salaryTo
                    ? `${fmt(salaryFrom)} — ${fmt(salaryTo)}`
                    : salaryFrom
                      ? `от ${fmt(salaryFrom)}`
                      : `до ${fmt(salaryTo!)}`}
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <h2 className="font-semibold text-foreground">Описание</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {vacancy.description}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4 border-t pt-6">
            {session?.user ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/dashboard/applications/new?vacancyId=${vacancy.id}`}>Откликнуться</Link>
              </Button>
            ) : (
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/login?callbackUrl=/vacancies/${vacancy.id}`}>Войти чтобы откликнуться</Link>
              </Button>
            )}
            {session?.user ? <ReportVacancyForm vacancyId={vacancy.id} /> : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
