import Link from "next/link";
import { trpc } from "@/trpc/server";
import { VacancyCard } from "@/components/VacancyCard";
import { VacancyFilters } from "./VacancyFilters";

export type VacancyListSearchParams = {
  specialty?: string;
  grade?: string;
  workFormat?: string;
  salaryFrom?: string;
  salaryTo?: string;
  sort?: "created_desc" | "salary_desc";
  query?: string;
  page?: string;
};

export async function VacancyListing({
  params,
  listPath,
}: {
  params: VacancyListSearchParams;
  listPath: string;
}) {
  const page = Number(params.page ?? 1);
  const salaryFrom = params.salaryFrom ? Number(params.salaryFrom) : undefined;
  const salaryTo = params.salaryTo ? Number(params.salaryTo) : undefined;

  const { items, total, totalPages } = await trpc.vacancies.list({
    specialty: params.specialty ? [params.specialty as never] : undefined,
    grade: params.grade ? [params.grade as never] : undefined,
    workFormat: params.workFormat ? [params.workFormat as never] : undefined,
    salaryFrom: Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    salaryTo: Number.isFinite(salaryTo) ? salaryTo : undefined,
    sort: params.sort ?? "created_desc",
    query: params.query,
    page,
    limit: 20,
  });

  const buildPageLink = (nextPage: number) => {
    const q = new URLSearchParams();
    q.set("page", String(nextPage));
    if (params.specialty) q.set("specialty", params.specialty);
    if (params.grade) q.set("grade", params.grade);
    if (params.workFormat) q.set("workFormat", params.workFormat);
    if (params.salaryFrom) q.set("salaryFrom", params.salaryFrom);
    if (params.salaryTo) q.set("salaryTo", params.salaryTo);
    if (params.sort) q.set("sort", params.sort);
    if (params.query) q.set("query", params.query);
    const qs = q.toString();
    return qs ? `${listPath}?${qs}` : listPath;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600">
          Referi
        </Link>
        <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Войти
        </Link>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Вакансии</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} {total === 1 ? "вакансия" : "вакансий"}
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <VacancyFilters currentParams={params} listPath={listPath} />
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
