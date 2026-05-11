import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { NewVacancyComposeWithBack } from "@/app/vacancies/new/NewVacancyComposeWithBack";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
          <div className={PAGE_COLUMN_CLASS}>
            {me.availableAttempts > 0 ? (
              <NewVacancyComposeWithBack
                title="Разместить рефералку"
                subtitle={`Доступных попыток: ${me.availableAttempts} из 3`}
                cardDescription="Заполните поля и нажмите «Опубликовать рефералку»."
                showForm
              />
            ) : (
              <NewVacancyComposeWithBack
                title="Разместить рефералку"
                subtitle={`Доступных попыток: ${me.availableAttempts} из 3`}
                showForm={false}
                emptyState={
                  <Alert>
                    <AlertTitle>Нет попыток</AlertTitle>
                    <AlertDescription>
                      Вы исчерпали все попытки. Попытки восстанавливаются автоматически через 60
                      дней.
                    </AlertDescription>
                  </Alert>
                }
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={null} />
      <main className="flex-1">
        <div className={PAGE_COLUMN_CLASS}>
          <NewVacancyComposeWithBack title="Разместить рефералку" showForm />
        </div>
      </main>
    </div>
  );
}
