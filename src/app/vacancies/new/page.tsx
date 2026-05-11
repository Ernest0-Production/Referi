import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { NewVacancyComposeWithBack } from "@/app/vacancies/new/NewVacancyComposeWithBack";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ru } from "@/locales";

const NP = ru.vacancies.newPage;

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
            {me.availableAttempts > 0 ? (
              <NewVacancyComposeWithBack
                title={NP.title}
                subtitle={NP.attemptsSubtitle(me.availableAttempts)}
                cardDescription={NP.cardDescription}
                showForm
              />
            ) : (
              <NewVacancyComposeWithBack
                title={NP.title}
                subtitle={NP.attemptsSubtitle(me.availableAttempts)}
                showForm={false}
                emptyState={
                  <Alert>
                    <AlertTitle>{NP.noAttemptsTitle}</AlertTitle>
                    <AlertDescription>{NP.noAttemptsBody}</AlertDescription>
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
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
          <NewVacancyComposeWithBack title={NP.title} showForm />
        </div>
      </main>
    </div>
  );
}
