import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  normalizeVacancyListSearchParams,
  parseCsvEnumParam,
  vacancyListFlatToSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_SPECIALTY_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
  type VacancyListSearchParamsInput,
} from "@/lib/vacancyListQuery";
import { readVacancyViewedIdsFromCookies } from "@/lib/vacancyViewedCookie";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilters } from "./VacancyFilters";
import { VacancyListChrome } from "./VacancyListChrome";

export type VacancyListSearchParams = VacancyListSearchParamsInput;

export async function VacancyListing({
  params,
  listPath,
}: {
  params: VacancyListSearchParams;
  listPath: string;
}) {
  const flat = normalizeVacancyListSearchParams(params);
  const page = Number(flat.page ?? 1);
  const salaryFrom = flat.salaryFrom ? Number(flat.salaryFrom) : undefined;

  const specialtyParsed = parseCsvEnumParam(flat.specialty, VACANCY_LIST_SPECIALTY_VALUES);
  const gradeParsed = parseCsvEnumParam(flat.grade, VACANCY_LIST_GRADE_VALUES);
  const workFormatParsed = parseCsvEnumParam(flat.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES);

  const session = await auth();
  const cookieStore = await cookies();
  const viewedIds = readVacancyViewedIdsFromCookies(cookieStore);
  const excludeIds = flat.hideViewed === "1" && viewedIds.length > 0 ? viewedIds : undefined;

  const { items, total, totalPages } = await trpc.vacancies.list({
    specialty: specialtyParsed,
    grade: gradeParsed,
    workFormat: workFormatParsed,
    salaryFrom: Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    sort: (flat.sort as "created_desc" | "salary_desc") ?? "created_desc",
    query: flat.query,
    page,
    limit: 20,
    excludeIds,
  });

  const activeSeekerVacancyIds = session?.user?.id
    ? new Set(await trpc.applications.activeVacancyIds())
    : new Set<string>();

  let presets: { id: string; name: string; params: unknown }[] = [];
  if (session?.user?.id) {
    presets = await trpc.vacancySearchPresets.list();
  }

  const buildPageLink = (nextPage: number) => {
    const q = vacancyListFlatToSearchParams({
      ...flat,
      page: String(nextPage),
    });
    const qs = q.toString();
    return qs ? `${listPath}?${qs}` : listPath;
  };

  return (
    <main className="min-h-screen bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={session} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <aside className="w-full shrink-0 md:sticky md:top-20 md:w-80 md:self-start">
            <VacancyFilters
              key={[
                flat.query,
                flat.specialty,
                flat.grade,
                flat.workFormat,
                flat.salaryFrom,
                flat.sort,
                flat.page,
                flat.hideViewed,
              ].join("|")}
              currentParams={flat}
              listPath={listPath}
              presets={presets}
              isLoggedIn={Boolean(session?.user)}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <VacancyListChrome
              key={`q:${flat.query ?? ""}|p:${flat.page ?? "1"}`}
              currentParams={flat}
              listPath={listPath}
              total={total}
            />

            {items.length === 0 ? (
              <div className="border-border bg-card rounded-2xl border p-8 text-center">
                <p className="text-muted-foreground">Вакансии не найдены</p>
                <p className="text-muted-foreground mt-1 text-sm">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((vacancy) => (
                  <VacancyCard
                    key={vacancy.id}
                    vacancy={vacancy}
                    hasActiveSeekerApplication={activeSeekerVacancyIds.has(vacancy.id)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {page > 1 ? (
                  <Link
                    href={buildPageLink(page - 1)}
                    className="border-border bg-card text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
                  >
                    Назад
                  </Link>
                ) : null}
                <span className="text-muted-foreground text-sm">
                  Страница {page} из {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={buildPageLink(page + 1)}
                    className="border-border bg-card text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium"
                  >
                    Вперёд
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
