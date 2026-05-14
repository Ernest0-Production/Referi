import { isVacancySalaryCurrency } from "@/lib/vacancySalaryCurrency";

export const VACANCY_LIST_SPECIALTY_VALUES = [
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "IOS_MOBILE",
  "ANDROID_MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
] as const;

export const VACANCY_LIST_GRADE_VALUES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const;

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

/** Распознаёт устаревший токен `MOBILE` как выбор iOS и Android. */
export function parseVacancyListSpecialtyCsvParam(
  raw: string | string[] | undefined,
): VacancyListSpecialty[] | undefined {
  const s = normalizeSearchParamRaw(raw)?.trim();
  if (!s) return undefined;
  const allow = new Set<string>(VACANCY_LIST_SPECIALTY_VALUES);
  const picked = new Set<string>();
  for (const part of s.split(",")) {
    const v = part.trim();
    if (!v) continue;
    if (v === "MOBILE") {
      if (allow.has("IOS_MOBILE")) picked.add("IOS_MOBILE");
      if (allow.has("ANDROID_MOBILE")) picked.add("ANDROID_MOBILE");
      continue;
    }
    if (allow.has(v)) picked.add(v);
  }
  if (!picked.size) return undefined;
  return VACANCY_LIST_SPECIALTY_VALUES.filter((a) => picked.has(a));
}

export function serializeCsvParam(values: readonly string[]): string | undefined {
  if (!values.length) return undefined;
  return values.join(",");
}

export type VacancyListFlatSearchParams = {
  specialty?: string;
  grade?: string;
  workFormat?: string;
  salaryCurrency?: string;
  salaryFrom?: string;
  sort?: string;
  query?: string;
  page?: string;
};

export type VacancyListSearchParamsInput = {
  specialty?: string | string[];
  grade?: string | string[];
  workFormat?: string | string[];
  salaryCurrency?: string | string[];
  salaryFrom?: string | string[];
  sort?: string | string[];
  query?: string | string[];
  page?: string | string[];
  openVacancyPresetSave?: string | string[];
};

function scalarSearchParam(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return typeof raw === "string" ? raw : raw.filter(Boolean).join(",");
}

export function normalizeVacancyListSearchParams(
  raw: VacancyListSearchParamsInput,
): VacancyListFlatSearchParams {
  return {
    specialty: scalarSearchParam(raw.specialty),
    grade: scalarSearchParam(raw.grade),
    workFormat: scalarSearchParam(raw.workFormat),
    salaryCurrency: scalarSearchParam(raw.salaryCurrency),
    salaryFrom: scalarSearchParam(raw.salaryFrom),
    sort: scalarSearchParam(raw.sort),
    query: scalarSearchParam(raw.query),
    page: scalarSearchParam(raw.page),
  };
}

export function vacancyListFlatToSearchParams(
  params: VacancyListFlatSearchParams,
): URLSearchParams {
  const q = new URLSearchParams();
  if (params.query?.trim()) q.set("query", params.query.trim());
  if (params.sort) q.set("sort", params.sort);
  if (params.specialty?.trim()) q.set("specialty", params.specialty.trim());
  if (params.grade?.trim()) q.set("grade", params.grade.trim());
  if (params.workFormat?.trim()) q.set("workFormat", params.workFormat.trim());
  if (params.salaryCurrency?.trim()) q.set("salaryCurrency", params.salaryCurrency.trim());
  if (params.salaryFrom?.trim()) q.set("salaryFrom", params.salaryFrom.trim());
  if (params.page) q.set("page", params.page);
  return q;
}

export function peelOpenVacancyPresetSaveFromSearchParamsInput(raw: VacancyListSearchParamsInput): {
  params: VacancyListSearchParamsInput;
  openVacancyPresetSave: boolean;
} {
  const { openVacancyPresetSave: rawFlag, ...rest } = raw;
  let openVacancyPresetSave = false;
  if (rawFlag !== undefined) {
    const s =
      typeof rawFlag === "string" ? rawFlag.trim() : rawFlag.filter(Boolean).join(",").trim();
    if (s === "1" || s.toLowerCase() === "true" || s.toLowerCase() === "yes") {
      openVacancyPresetSave = true;
    }
  }
  return { params: rest, openVacancyPresetSave };
}

export function buildVacancyCatalogLoginReturnHref(flat: VacancyListFlatSearchParams): string {
  const q = vacancyListFlatToSearchParams(flat);
  q.set("openVacancyPresetSave", "1");
  const s = q.toString();
  return s.length > 0 ? `/?${s}` : "/?openVacancyPresetSave=1";
}

export function mergeVacancyListFlat(
  current: VacancyListFlatSearchParams,
  patch: Partial<VacancyListFlatSearchParams>,
): VacancyListFlatSearchParams {
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
  return merged;
}

export function mergeVacancyListQueryParams(
  current: VacancyListFlatSearchParams,
  patch: Partial<VacancyListFlatSearchParams>,
): URLSearchParams {
  return vacancyListFlatToSearchParams(mergeVacancyListFlat(current, patch));
}

export function flatParamsForPresetSave(flat: VacancyListFlatSearchParams): Record<string, string> {
  const keys = ["grade", "workFormat", "sort", "query"] as const;
  const out: Record<string, string> = {};
  const sp = serializeCsvParam(parseVacancyListSpecialtyCsvParam(flat.specialty) ?? []);
  if (sp) out.specialty = sp;
  for (const k of keys) {
    const v = flat[k];
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
  const salaryFrom = flat.salaryFrom?.trim();
  if (salaryFrom) {
    out.salaryFrom = salaryFrom;
    const cur = flat.salaryCurrency?.trim();
    if (cur && isVacancySalaryCurrency(cur)) out.salaryCurrency = cur;
  }
  return out;
}

/** Есть ненулевые поля, входящие в сохраняемый пресет (фильтры, поиск, сортировка). Страница пагинации не учитывается. */
export function vacancyCatalogHasPresetSaveFields(flat: VacancyListFlatSearchParams): boolean {
  return Object.keys(flatParamsForPresetSave(flat)).length > 0;
}

/** Параметры каталога без привязанного пресета: «как после полного сброса» (первая страница, нет полей пресета). */
export function isVacancyCatalogFlatBaseline(flat: VacancyListFlatSearchParams): boolean {
  if (vacancyCatalogHasPresetSaveFields(flat)) return false;
  const page = flat.page?.trim();
  if (page && page !== "1") return false;
  return true;
}

export function presetParamsFromJson(
  raw: unknown,
): Partial<
  Pick<
    VacancyListFlatSearchParams,
    "specialty" | "grade" | "workFormat" | "salaryCurrency" | "salaryFrom" | "sort" | "query"
  >
> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const s = (k: keyof typeof o) => (typeof o[k] === "string" ? o[k] : undefined);
  const salaryFromRaw = s("salaryFrom");
  const salaryFrom = salaryFromRaw?.trim() ? salaryFromRaw.trim() : undefined;
  const salaryCurrencyRaw = s("salaryCurrency");
  const salaryCurrency =
    salaryFrom && salaryCurrencyRaw?.trim() && isVacancySalaryCurrency(salaryCurrencyRaw.trim())
      ? salaryCurrencyRaw.trim()
      : undefined;
  return {
    specialty: s("specialty"),
    grade: s("grade"),
    workFormat: s("workFormat"),
    salaryCurrency,
    salaryFrom,
    sort: s("sort"),
    query: s("query"),
  };
}

const PRESET_SAVE_KEYS = [
  "specialty",
  "grade",
  "workFormat",
  "salaryCurrency",
  "salaryFrom",
  "sort",
  "query",
] as const;

/** Снимок полей пресета с фиксированным порядком значений в CSV мультивыборов (как после `parseCsvEnumParam`). */
function canonicalPresetSaveRecord(rec: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const canonCsv = <T extends string>(raw: string | undefined, allowed: readonly T[]) => {
    const parsed = parseCsvEnumParam(raw, allowed);
    const s = serializeCsvParam(parsed ?? []);
    if (s) return s;
    return undefined;
  };
  const sp = serializeCsvParam(parseVacancyListSpecialtyCsvParam(rec.specialty) ?? []);
  if (sp) out.specialty = sp;
  const gr = canonCsv(rec.grade, VACANCY_LIST_GRADE_VALUES);
  if (gr) out.grade = gr;
  const wf = canonCsv(rec.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES);
  if (wf) out.workFormat = wf;
  const sf = rec.salaryFrom?.trim();
  if (typeof sf === "string" && sf) {
    out.salaryFrom = sf;
    const cur = rec.salaryCurrency?.trim();
    if (cur && isVacancySalaryCurrency(cur)) out.salaryCurrency = cur;
  }
  for (const k of ["sort", "query"] as const) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function presetSaveRecordsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ca = canonicalPresetSaveRecord(a);
  const cb = canonicalPresetSaveRecord(b);
  for (const k of PRESET_SAVE_KEYS) {
    if ((ca[k] ?? "") !== (cb[k] ?? "")) return false;
  }
  return true;
}

/** Нормализованные поля пресета в том же виде, что при сохранении (`flatParamsForPresetSave`). */
export function normalizedPresetParamsRecord(raw: unknown): Record<string, string> {
  const partial = presetParamsFromJson(raw);
  return flatParamsForPresetSave(partial);
}

/** Поля каталога, участвующие в пресете, совпадают со снимком `presetParams` (как при сохранении). */
export function isVacancyFlatMatchingPresetParams(
  flat: VacancyListFlatSearchParams,
  presetParams: unknown,
): boolean {
  return presetSaveRecordsEqual(
    flatParamsForPresetSave(flat),
    normalizedPresetParamsRecord(presetParams),
  );
}

/** Первый пресет из списка, чьи параметры совпадают с текущим набором фильтров каталога. */
export function findMatchingVacancySearchPresetId(
  flat: VacancyListFlatSearchParams,
  presets: readonly { id: string; params: unknown }[],
): string | undefined {
  const current = flatParamsForPresetSave(flat);
  for (const p of presets) {
    if (presetSaveRecordsEqual(current, normalizedPresetParamsRecord(p.params))) {
      return p.id;
    }
  }
  return undefined;
}
