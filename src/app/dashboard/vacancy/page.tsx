import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { firstQueryParam } from "@/lib/searchParams";
import { trpc } from "@/trpc/server";
import { dashboardVacancyEditTrail, dashboardVacancyTrail } from "@/lib/navBreadcrumbTrail";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { DashboardVacancyNav } from "./DashboardVacancyNav";
import { DashboardVacancyPageShell } from "./DashboardVacancyPageShell";
import { EditVacancyCard } from "./EditVacancyCard";
import { ManageVacancyPanel } from "./ManageVacancyPanel";
import { VacancyApplicantsSection } from "./VacancyApplicantsSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

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
        <DashboardVacancyNav segments={breadcrumbSegments} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">
              {vacancy ? "Моя рефералка" : "Создание рефералки"}
            </h1>
            {vacancy && !editMode ? (
              <p className="text-muted-foreground text-sm">
                Доступных попыток: {me.availableAttempts} из 3
              </p>
            ) : null}
          </div>

          {vacancy ? (
            editMode ? (
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
            ) : (
              <div className="flex flex-col gap-8">
                <ManageVacancyPanel vacancy={vacancy} />
                <VacancyApplicantsSection vacancyId={vacancy.id} vacancyTitle={vacancy.title} />
              </div>
            )
          ) : (
            <Card>
              <CardContent className="flex flex-col gap-4">
                {me.availableAttempts > 0 ? (
                  <CreateVacancyForm />
                ) : (
                  <Alert>
                    <AlertTitle>Нет попыток</AlertTitle>
                    <AlertDescription>
                      Вы исчерпали все попытки. Попытки восстанавливаются автоматически через 60
                      дней.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardVacancyPageShell>
    </main>
  );
}
