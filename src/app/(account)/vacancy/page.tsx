import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { firstQueryParam } from "@/lib/searchParams";
import { trpc } from "@/trpc/server";
import { dashboardVacancyEditTrail, dashboardVacancyTrail } from "@/lib/navBreadcrumbTrail";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { DashboardVacancyNav } from "./DashboardVacancyNav";
import { DashboardVacancyPageShell } from "./DashboardVacancyPageShell";
import { EditVacancyCard } from "./EditVacancyCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";

type PageProps = {
  searchParams: Promise<{ edit?: string; fromVacancy?: string | string[] }>;
};

export default async function DashboardVacancyPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const { edit } = sp;
  const editMode = edit === "1" || edit === "true";
  const fromVacancyParam = firstQueryParam(sp.fromVacancy);

  const me = await trpc.auth.me();
  const vacancy = await trpc.vacancies.myActive();

  const openedFromPublicVacancyDetail = Boolean(
    vacancy && editMode && fromVacancyParam === vacancy.id,
  );

  const breadcrumbSegments =
    vacancy && editMode
      ? dashboardVacancyEditTrail(vacancy.id, vacancy.title, openedFromPublicVacancyDetail)
      : dashboardVacancyTrail(vacancy ? "Моя рефералка" : "Создание рефералки");

  return (
    <main className="flex-1">
      <DashboardVacancyPageShell>
        <BreadcrumbSeedPort seed={breadcrumbSegments} />
        <DashboardVacancyNav />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">
              {vacancy ? "Моя рефералка" : "Создание рефералки"}
            </h1>
            {vacancy && editMode ? (
              <p className="text-muted-foreground text-sm">
                Доступных попыток: {me.availableAttempts} из 3
              </p>
            ) : null}
          </div>

          {vacancy && editMode ? (
            <EditVacancyCard
              vacancy={{
                id: vacancy.id,
                title: vacancy.title,
                companyName: vacancy.companyName,
                specialty: vacancy.specialty,
                grade: vacancy.grade,
                workFormat: vacancy.workFormat,
                salaryCurrency: vacancy.salaryCurrency,
                salaryFromKopecks: vacancy.salaryFromKopecks,
                salaryToKopecks: vacancy.salaryToKopecks,
                description: vacancy.description,
                rewardKopecks: vacancy.rewardKopecks,
              }}
            />
          ) : vacancy && !editMode ? (
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-muted-foreground text-sm">
                  Управление заявками и кандидатами — на публичной странице рефералки в каталоге.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/vacancies/${vacancy.id}`}>Открыть рефералку</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/vacancy?edit=1&fromVacancy=${vacancy.id}`}>Редактировать</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !vacancy ? (
            <Card>
              <CardContent className="flex flex-col gap-4">
                {me.availableAttempts > 0 ? (
                  <CreateVacancyForm />
                ) : (
                  <Alert>
                    <AlertTitle>Нет попыток</AlertTitle>
                    <AlertDescription>
                      У тебя не осталось попыток. Они восстанавливаются автоматически через 60
                      дней.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DashboardVacancyPageShell>
    </main>
  );
}
