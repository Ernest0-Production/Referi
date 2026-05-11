"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import { trpcReact } from "@/trpc/client";
import { VacancyCard } from "@/components/VacancyCard";
import { Button } from "@/components/ui/button";

type MyActiveOut = inferRouterOutputs<AppRouter>["vacancies"]["myActive"];

function CreateVacancyHomeCta({ href }: { href: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground max-w-xl text-sm">
        Хочешь найти коллегу себе в команду? Размести рефералку!
      </p>
      <Button asChild className="shrink-0">
        <Link href={href}>🙌 Я хочу зарефералить</Link>
      </Button>
    </div>
  );
}

export function EmployerHomeVacancySection({
  employerVacancyPreview,
  isLoggedIn,
}: {
  employerVacancyPreview: MyActiveOut;
  isLoggedIn: boolean;
}) {
  const myActiveQuery = trpcReact.vacancies.myActive.useQuery(undefined, {
    enabled: isLoggedIn,
    initialData: employerVacancyPreview ?? undefined,
  });

  if (!isLoggedIn) {
    return <CreateVacancyHomeCta href="/vacancies/new" />;
  }

  const vacancy = myActiveQuery.data;

  if (vacancy) {
    const detailHref =
      vacancy.status === "ACTIVE" ? `/vacancies/${vacancy.id}` : "/dashboard/vacancy";

    return (
      <section className="flex flex-col gap-3" aria-labelledby="employer-vacancy-heading">
        <div className="flex flex-row items-center justify-between gap-2">
          <h2 id="employer-vacancy-heading" className="text-foreground text-lg font-semibold">
            Ваша рефералка
          </h2>
          <Button variant="link" className="text-primary h-auto px-0 py-0 text-sm" asChild>
            <Link href="/dashboard/vacancy">Управление</Link>
          </Button>
        </div>
        <VacancyCard vacancy={vacancy} detailHref={detailHref} />
      </section>
    );
  }

  return <CreateVacancyHomeCta href="/dashboard/vacancy" />;
}
