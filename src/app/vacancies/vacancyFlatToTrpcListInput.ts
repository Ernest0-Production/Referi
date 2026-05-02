import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import {
  parseCsvEnumParam,
  type VacancyListFlatSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_SPECIALTY_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
} from "@/lib/vacancyListQuery";

export type VacancyListTrpcInput = inferRouterInputs<AppRouter>["vacancies"]["list"];

export function vacancyListInputStableKey(input: VacancyListTrpcInput): string {
  return JSON.stringify({
    specialty: input.specialty ?? null,
    grade: input.grade ?? null,
    workFormat: input.workFormat ?? null,
    salaryFrom: input.salaryFrom ?? null,
    query: input.query ?? null,
    sort: input.sort,
    page: input.page,
    limit: input.limit,
    excludeIds: input.excludeIds ?? null,
  });
}

export function vacancyFlatToTrpcListInput(
  flat: VacancyListFlatSearchParams,
  viewedVacancyIds: string[],
): VacancyListTrpcInput {
  const page = Number(flat.page ?? 1) || 1;
  const salaryFrom = flat.salaryFrom ? Number(flat.salaryFrom) : undefined;
  const specialtyParsed = parseCsvEnumParam(flat.specialty, VACANCY_LIST_SPECIALTY_VALUES);
  const gradeParsed = parseCsvEnumParam(flat.grade, VACANCY_LIST_GRADE_VALUES);
  const workFormatParsed = parseCsvEnumParam(flat.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES);
  const excludeIds =
    flat.hideViewed === "1" && viewedVacancyIds.length > 0 ? viewedVacancyIds : undefined;

  return {
    specialty: specialtyParsed,
    grade: gradeParsed,
    workFormat: workFormatParsed,
    salaryFrom: Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    sort: (flat.sort as "created_desc" | "salary_desc") ?? "created_desc",
    query: flat.query,
    page,
    limit: 20,
    excludeIds,
  };
}
