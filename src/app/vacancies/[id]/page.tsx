import { IconCoins } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { trpc } from "@/trpc/server";
import { VacancyOwnerActions } from "@/app/dashboard/vacancy/VacancyOwnerActions";
import { ReportVacancyForm } from "./ReportVacancyForm";
import { ReferrerCompensationPanel } from "./ReferrerCompensationPanel";
import { VacancyDetailMetaBadges } from "./VacancyDetailMetaBadges";
import { VacancyViewCookieWriter } from "../VacancyViewCookieWriter";
import { ApplicationCountIcon } from "@/components/vacancy/VacancyFieldIcons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVacancySalaryRange } from "@/lib/vacancySalaryCurrency";
import { cn } from "@/lib/utils";

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
  const hasSalaryBlock = Boolean(salaryLine);
  const hasCompensationBlock = reward > 0;
  const salaryAndCompensationRow = hasSalaryBlock && hasCompensationBlock;

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
            <VacancyDetailMetaBadges
              specialty={vacancy.specialty}
              grade={vacancy.grade}
              workFormat={vacancy.workFormat}
              applicationCount={vacancy.applicationCount}
            />

            {hasSalaryBlock || hasCompensationBlock ? (
              <div
                className={cn(
                  "flex flex-col gap-4",
                  salaryAndCompensationRow && "sm:flex-row sm:items-stretch",
                )}
              >
                {salaryLine ? (
                  <div
                    className={cn(
                      "flex flex-col gap-2.5 rounded-xl border border-emerald-600/25 bg-emerald-600/10 px-4 py-3",
                      salaryAndCompensationRow && "min-w-0 sm:min-h-0 sm:flex-1 sm:basis-0",
                    )}
                  >
                    <p className="flex min-w-0 items-start gap-1.5 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                      <IconCoins className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
                      <span className="min-w-0 leading-snug break-words">Зарплата</span>
                    </p>
                    <p className="font-semibold break-words text-emerald-950 dark:text-emerald-50">
                      {salaryLine}
                    </p>
                  </div>
                ) : null}

                {hasCompensationBlock ? (
                  <ReferrerCompensationPanel
                    amountText={fmtRub(reward)}
                    className={cn(salaryAndCompensationRow && "sm:min-h-0 sm:flex-1 sm:basis-0")}
                  />
                ) : null}
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
                      <ApplicationCountIcon data-icon="inline-start" className="text-current" />
                      Попросить рефералку
                  </Link>
                </Button>
              )
            ) : (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/login?callbackUrl=/vacancies/${vacancy.id}`}>
                    Войти, чтобы попросить рефералку
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
