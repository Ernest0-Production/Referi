export const VACANCY_LIST_SPECIALTY_VALUES = [
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
  "OTHER",
] as const;

export const VACANCY_LIST_GRADE_VALUES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;

export const VACANCY_LIST_WORK_FORMAT_VALUES = ["REMOTE", "HYBRID", "OFFICE"] as const;

export type VacancyListSpecialty = (typeof VACANCY_LIST_SPECIALTY_VALUES)[number];
export type VacancyListGrade = (typeof VACANCY_LIST_GRADE_VALUES)[number];
export type VacancyListWorkFormat = (typeof VACANCY_LIST_WORK_FORMAT_VALUES)[number];

function normalizeSearchParamRaw(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw === "string") return raw;
  return raw.filter(Boolean).join(",");
}

export function parseCsvEnumParam<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[],
): T[] | undefined {
  const s = normalizeSearchParamRaw(raw)?.trim();
  if (!s) return undefined;
  const allow = new Set<string>(allowed);
  const picked = new Set<string>();
  for (const part of s.split(",")) {
    const v = part.trim();
    if (allow.has(v)) picked.add(v);
  }
  if (!picked.size) return undefined;
  return allowed.filter((a) => picked.has(a));
}

export function serializeCsvParam(values: readonly string[]): string | undefined {
  if (!values.length) return undefined;
  return values.join(",");
}

export type VacancyListFlatSearchParams = {
  specialty?: string;
  grade?: string;
  workFormat?: string;
  salaryFrom?: string;
  sort?: string;
  query?: string;
  page?: string;
};

export type VacancyListSearchParamsInput = {
  specialty?: string | string[];
  grade?: string | string[];
  workFormat?: string | string[];
  salaryFrom?: string | string[];
  sort?: string | string[];
  query?: string | string[];
  page?: string | string[];
};

function scalarSearchParam(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return typeof raw === "string" ? raw : raw.filter(Boolean).join(",");
}

export function normalizeVacancyListSearchParams(raw: VacancyListSearchParamsInput): VacancyListFlatSearchParams {
  return {
    specialty: scalarSearchParam(raw.specialty),
    grade: scalarSearchParam(raw.grade),
    workFormat: scalarSearchParam(raw.workFormat),
    salaryFrom: scalarSearchParam(raw.salaryFrom),
    sort: scalarSearchParam(raw.sort),
    query: scalarSearchParam(raw.query),
    page: scalarSearchParam(raw.page),
  };
}

export function vacancyListFlatToSearchParams(params: VacancyListFlatSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  if (params.query?.trim()) q.set("query", params.query.trim());
  if (params.sort) q.set("sort", params.sort);
  if (params.specialty?.trim()) q.set("specialty", params.specialty.trim());
  if (params.grade?.trim()) q.set("grade", params.grade.trim());
  if (params.workFormat?.trim()) q.set("workFormat", params.workFormat.trim());
  if (params.salaryFrom?.trim()) q.set("salaryFrom", params.salaryFrom.trim());
  if (params.page) q.set("page", params.page);
  return q;
}

export function mergeVacancyListQueryParams(
  current: VacancyListFlatSearchParams,
  patch: Partial<VacancyListFlatSearchParams>,
): URLSearchParams {
  const merged: VacancyListFlatSearchParams = { ...current };
  for (const key of Object.keys(patch) as (keyof VacancyListFlatSearchParams)[]) {
    const v = patch[key];
    if (v === undefined) {
      delete merged[key];
    } else {
      merged[key] = v;
    }
  }
  merged.page = patch.page ?? "1";
  return vacancyListFlatToSearchParams(merged);
}
