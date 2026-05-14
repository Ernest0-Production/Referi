import { IconCoins } from "@tabler/icons-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { publicVacancyDetailTrail } from "@/lib/navBreadcrumbTrail";
import { VacancyPublicBreadcrumbShell } from "../VacancyPublicBreadcrumbShell";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { trpc } from "@/trpc/server";
import { VacancyOwnerActions } from "@/app/(account)/vacancy/VacancyOwnerActions";
import { ReportVacancyForm } from "./ReportVacancyForm";
import { ReferrerCompensationPanel } from "./ReferrerCompensationPanel";
import { VacancyDetailMetaBadges } from "./VacancyDetailMetaBadges";
import { VacancyViewCookieWriter } from "../VacancyViewCookieWriter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVacancySalaryRange } from "@/lib/vacancySalaryCurrency";
import { formatVacancyReferralRequestFooterHint } from "@/lib/vacancyReferralRequestFooterHint";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { firstQueryParam } from "@/lib/searchParams";
import { cn } from "@/lib/utils";
import { VacancyAuthorManageSection } from "./VacancyAuthorManageSection";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ applicationId?: string | string[] }>;
}

export default async function VacancyDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const applicationIdParam = firstQueryParam(sp.applicationId);
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

  const vacancyBreadcrumbSegments = publicVacancyDetailTrail(vacancy.title);

  return (
    <main className="min-h-screen bg-[var(--app-page-surface)]">
      <VacancyViewCookieWriter vacancyId={id} />
      <PublicHeaderNav session={session} />

      <div className={PAGE_COLUMN_CLASS}>
        <VacancyPublicBreadcrumbShell seed={vacancyBreadcrumbSegments} />

        <div className="flex flex-col gap-3">
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
                    editHref={`/vacancy?edit=1&fromVacancy=${vacancy.id}`}
                    redirectAfterDelete="/"
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                      <Link
                        href={`/applications/new?vacancyId=${vacancy.id}&fromVacancy=${vacancy.id}`}
                      >
                        <span
                          data-icon="inline-start"
                          className="shrink-0 text-base leading-none"
                          aria-hidden
                        >
                          🙏
                        </span>
                        Попросить рефералку
                      </Link>
                    </Button>
                    <p
                      className="text-muted-foreground text-left text-xs leading-snug"
                      role="status"
                    >
                      {formatVacancyReferralRequestFooterHint(vacancy.applicationCount)}
                    </p>
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href={`/login?callbackUrl=/vacancies/${vacancy.id}`}>
                      Войти, чтобы попросить рефералку
                    </Link>
                  </Button>
                  <p className="text-muted-foreground text-left text-xs leading-snug" role="status">
                    {formatVacancyReferralRequestFooterHint(vacancy.applicationCount)}
                  </p>
                </div>
              )}
            </CardFooter>
          </Card>
          {session?.user && !isAuthor ? <ReportVacancyForm vacancyId={vacancy.id} /> : null}
          {session?.user && isAuthor ? (
            <VacancyAuthorManageSection
              vacancyId={vacancy.id}
              vacancyTitle={vacancy.title}
              applicationId={applicationIdParam}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
