import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { CreateVacancyForm } from "@/app/dashboard/vacancy/CreateVacancyForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewVacancyPage() {
  const session = await auth();

  if (session?.user?.id) {
    const vacancy = await trpc.vacancies.myActive();
    if (vacancy) {
      redirect("/dashboard/vacancy");
    }

    const me = await trpc.auth.me();

    return (
      <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
        <PublicHeaderNav session={session} />
        <main className="flex-1">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-foreground text-2xl font-bold">Разместить вакансию</h1>
              <p className="text-muted-foreground text-sm">
                Доступных попыток: {me.availableAttempts} из 3
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Новая вакансия</CardTitle>
                <CardDescription>Заполните поля и нажмите «Опубликовать вакансию».</CardDescription>
              </CardHeader>
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={null} />
      <main className="flex-1">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">Разместить вакансию</h1>
            <p className="text-muted-foreground text-sm">
              Заполните форму — вход через GitHub потребуется только в момент публикации.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Новая вакансия</CardTitle>
              <CardDescription>
                Данные сохраняются в браузере перед переходом к авторизации.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CreateVacancyForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
