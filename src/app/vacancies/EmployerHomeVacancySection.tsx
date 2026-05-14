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
  onBeforeNavigateToDetail,
}: {
  employerVacancyPreview: MyActiveOut;
  isLoggedIn: boolean;
  onBeforeNavigateToDetail?: () => void;
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
    const detailHref = `/vacancies/${vacancy.id}`;

    return (
      <section className="flex flex-col gap-3" aria-labelledby="employer-vacancy-heading">
        <h2 id="employer-vacancy-heading" className="text-foreground text-lg font-semibold">
          Твоя рефералка
        </h2>
        <VacancyCard
          vacancy={vacancy}
          detailHref={detailHref}
          onBeforeNavigateToDetail={onBeforeNavigateToDetail}
        />
      </section>
    );
  }

  return <CreateVacancyHomeCta href="/vacancy" />;
}
