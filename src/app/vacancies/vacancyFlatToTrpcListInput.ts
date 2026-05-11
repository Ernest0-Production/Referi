import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import {
  parseCsvEnumParam,
  parseVacancyListSpecialtyCsvParam,
  type VacancyListFlatSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
} from "@/lib/vacancyListQuery";
import { isVacancySalaryCurrency } from "@/lib/vacancySalaryCurrency";

export type VacancyListTrpcInput = inferRouterInputs<AppRouter>["vacancies"]["list"];

export function vacancyListInputStableKey(input: VacancyListTrpcInput): string {
  return JSON.stringify({
    specialty: input.specialty ?? null,
    grade: input.grade ?? null,
    workFormat: input.workFormat ?? null,
    salaryCurrency: input.salaryCurrency ?? null,
    salaryFrom: input.salaryFrom ?? null,
    query: input.query ?? null,
    sort: input.sort,
    page: input.page,
    limit: input.limit,
  });
}

export function vacancyFlatToTrpcListInput(
  flat: VacancyListFlatSearchParams,
): VacancyListTrpcInput {
  const page = Number(flat.page ?? 1) || 1;
  const salaryFrom = flat.salaryFrom ? Number(flat.salaryFrom) : undefined;
  const salaryCurrencyRaw = flat.salaryCurrency?.trim();
  const salaryCurrency =
    salaryCurrencyRaw && isVacancySalaryCurrency(salaryCurrencyRaw) ? salaryCurrencyRaw : undefined;
  const specialtyParsed = parseVacancyListSpecialtyCsvParam(flat.specialty);
  const gradeParsed = parseCsvEnumParam(flat.grade, VACANCY_LIST_GRADE_VALUES);
  const workFormatParsed = parseCsvEnumParam(flat.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES);

  return {
    specialty: specialtyParsed,
    grade: gradeParsed,
    workFormat: workFormatParsed,
    salaryCurrency,
    salaryFrom: Number.isFinite(salaryFrom) ? salaryFrom : undefined,
    sort: (flat.sort as "created_desc" | "salary_desc") ?? "created_desc",
    query: flat.query,
    page,
    limit: 20,
  };
}
