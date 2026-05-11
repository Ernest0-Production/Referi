import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { trpc } from "@/trpc/server";
import { VacancyOwnerActions } from "@/app/dashboard/vacancy/VacancyOwnerActions";
import { ReportVacancyForm } from "./ReportVacancyForm";
import { VacancyViewCookieWriter } from "../VacancyViewCookieWriter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { formatVacancySalaryRange } from "@/lib/vacancySalaryCurrency";
import {
  GradeIcon,
  SpecialtyIcon,
  WorkFormatIcon,
  ApplicationCountIcon,
} from "@/components/vacancy/VacancyFieldIcons";

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
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
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

  let vacancy: Awaited<ReturnType<typeof trpc.vacancies.getById>>;
  try {
    vacancy = await trpc.vacancies.getById({ id });
  } catch {
    notFound();
  }

  const isAuthor = vacancy.isMine;

  const salaryLine = formatVacancySalaryRange(
    vacancy.salaryFromKopecks,
    vacancy.salaryToKopecks,
    vacancy.salaryCurrency,
  );
  const reward = Math.round(Number(vacancy.rewardKopecks) / 100);

  const fmtRub = (v: number) =>
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
          <Link href="/">← Все рефералки</Link>
        </Button>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl">{vacancy.title}</CardTitle>
              <p className="text-muted-foreground text-sm">{vacancy.companyName}</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-normal">
                <SpecialtyIcon specialty={vacancy.specialty} className="text-current" />
                {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                <GradeIcon className="text-current" />
                {GRADE_LABELS[vacancy.grade] ?? vacancy.grade}
              </Badge>
              <Badge variant="secondary" className="font-normal">
                <WorkFormatIcon format={vacancy.workFormat} className="text-current" />
                {FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}
              </Badge>
              <Badge variant="outline" className="font-normal">
                <ApplicationCountIcon className="text-current" />
                {formatApplicationCountLabel(vacancy.applicationCount)}
              </Badge>
            </div>

            {salaryLine ? (
              <div className="border-border bg-muted/50 rounded-xl border px-4 py-3">
                <p className="text-muted-foreground text-sm">Зарплата</p>
                <p className="text-foreground font-semibold">{salaryLine}</p>
              </div>
            ) : null}

            {reward > 0 ? (
              <div className="border-border bg-muted/50 rounded-xl border px-4 py-3">
                <p className="text-muted-foreground text-sm">Бонус</p>
                <p className="text-foreground font-semibold">{fmtRub(reward)}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <h2 className="text-foreground font-semibold">Описание</h2>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {vacancy.description}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4 border-t pt-6">
            {session?.user ? (
              isAuthor ? (
                <VacancyOwnerActions
                  vacancyId={vacancy.id}
                  editHref="/dashboard/vacancy?edit=1"
                  redirectAfterDelete="/"
                />
              ) : (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={`/dashboard/applications/new?vacancyId=${vacancy.id}`}>
                    Откликнуться
                  </Link>
                </Button>
              )
            ) : (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/login?callbackUrl=/vacancies/${vacancy.id}`}>
                  Войти чтобы откликнуться
                </Link>
              </Button>
            )}
            {session?.user ? <ReportVacancyForm vacancyId={vacancy.id} /> : null}
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
