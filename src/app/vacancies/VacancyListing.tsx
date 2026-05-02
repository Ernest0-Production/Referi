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
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilters } from "./VacancyFilters";

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

  const { items, total, totalPages } = await trpc.vacancies.list({
    specialty: specialtyParsed,
    grade: gradeParsed,
    workFormat: workFormatParsed,
    salaryFrom: Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    sort: (flat.sort as "created_desc" | "salary_desc") ?? "created_desc",
    query: flat.query,
    page,
    limit: 20,
  });

  const buildPageLink = (nextPage: number) => {
    const q = vacancyListFlatToSearchParams({
      ...flat,
      page: String(nextPage),
    });
    const qs = q.toString();
    return qs ? `${listPath}?${qs}` : listPath;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <PublicHeaderNav session={session} />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Вакансии</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} {total === 1 ? "вакансия" : "вакансий"}
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <VacancyFilters
              key={[
                flat.query,
                flat.specialty,
                flat.grade,
                flat.workFormat,
                flat.salaryFrom,
                flat.sort,
                flat.page,
              ].join("|")}
              currentParams={flat}
              listPath={listPath}
            />
          </aside>

          <div className="flex-1 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
                <p className="text-gray-500">Вакансии не найдены</p>
                <p className="mt-1 text-sm text-gray-400">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              items.map((vacancy) => <VacancyCard key={vacancy.id} vacancy={vacancy} />)
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {page > 1 && (
                  <a
                    href={buildPageLink(page - 1)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Назад
                  </a>
                )}
                <span className="text-sm text-gray-500">
                  Страница {page} из {totalPages}
                </span>
                {page < totalPages && (
                  <a
                    href={buildPageLink(page + 1)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Вперёд
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
