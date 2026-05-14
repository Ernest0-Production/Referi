import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { NewVacancyComposeWithBack } from "@/app/vacancies/new/NewVacancyComposeWithBack";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewVacancyPage() {
  const session = await auth();

  if (session?.user?.id) {
    const vacancy = await trpc.vacancies.myActive();
    if (vacancy) {
      return (
        <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
          <PublicHeaderNav session={session} />
          <main className="flex-1">
            <div className={PAGE_COLUMN_CLASS}>
              <Card>
                <CardContent className="flex flex-col gap-4 py-8">
                  <p className="text-muted-foreground text-sm">
                    У тебя уже есть активная рефералка. Публикация новой через эту форму недоступна,
                    пока она действует.
                  </p>
                  <Button asChild className="w-fit">
                    <Link href={`/vacancies/${vacancy.id}`}>Открыть мою рефералку</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      );
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
                cardDescription="Заполни поля и нажми «Опубликовать рефералку»."
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
                      У тебя не осталось попыток. Они восстанавливаются автоматически через 60
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
