import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { EditVacancyCard } from "./EditVacancyCard";
import { ManageVacancyPanel } from "./ManageVacancyPanel";
import { VacancyApplicantsSection } from "./VacancyApplicantsSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function DashboardVacancyPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { edit } = await searchParams;
  const editMode = edit === "1" || edit === "true";

  const me = await trpc.auth.me();
  const vacancy = await trpc.vacancies.myActive();

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Моя рефералка</h1>
          {vacancy ? (
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
            <>
              <ManageVacancyPanel vacancy={vacancy} />
              <VacancyApplicantsSection vacancyId={vacancy.id} vacancyTitle={vacancy.title} />
            </>
          )
        ) : (
          <Card>
            <CardHeader>
                <CardTitle>Разместить рефералку</CardTitle>
                <CardDescription>У вас нет активной рефералки. Заполните форму ниже.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {me.availableAttempts > 0 ? (
                <CreateVacancyForm />
              ) : (
                <Alert>
                  <AlertTitle>Нет попыток</AlertTitle>
                  <AlertDescription>
                    Вы исчерпали все попытки. Попытки восстанавливаются автоматически через 60 дней.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
