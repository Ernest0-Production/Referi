const VACANCY_CREATE_DRAFT_STORAGE_KEY = "referri:vacancy-create-draft";

export type VacancyCreateDraftFields = {
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  salaryCurrency: string;
  salaryFrom: string;
  salaryTo: string;
  description: string;
  referrerBonusRubles: number;
};

export function saveVacancyCreateDraft(data: VacancyCreateDraftFields): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VACANCY_CREATE_DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage может быть недоступен (приватный режим / квота)
  }
}

export function loadVacancyCreateDraft(): VacancyCreateDraftFields | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(VACANCY_CREATE_DRAFT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : "";
  const companyName = typeof o.companyName === "string" ? o.companyName : "";
  const specialty = typeof o.specialty === "string" ? o.specialty : "";
  const grade = typeof o.grade === "string" ? o.grade : "";
  const workFormat = typeof o.workFormat === "string" ? o.workFormat : "";
  const salaryCurrency = typeof o.salaryCurrency === "string" ? o.salaryCurrency : "";
  const salaryFrom = typeof o.salaryFrom === "string" ? o.salaryFrom : "";
  const salaryTo = typeof o.salaryTo === "string" ? o.salaryTo : "";
  const description = typeof o.description === "string" ? o.description : "";
  const bonusRaw = o.referrerBonusRubles;
  const referrerBonusRubles =
    typeof bonusRaw === "number" && Number.isFinite(bonusRaw) ? bonusRaw : 0;

  return {
    title,
    companyName,
    specialty,
    grade,
    workFormat,
    salaryCurrency,
    salaryFrom,
    salaryTo,
    description,
    referrerBonusRubles,
  };
}

export function clearVacancyCreateDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(VACANCY_CREATE_DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}
