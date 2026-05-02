import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { ManageVacancyPanel } from "./ManageVacancyPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardVacancyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();
  const vacancy = await trpc.vacancies.myActive();

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Моя вакансия</h1>
          <p className="text-muted-foreground text-sm">
            Доступных попыток: {me.availableAttempts} из 3
          </p>
        </div>

        {vacancy ? (
          <ManageVacancyPanel vacancy={vacancy} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Разместить вакансию</CardTitle>
              <CardDescription>У вас нет активной вакансии. Заполните форму ниже.</CardDescription>
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
