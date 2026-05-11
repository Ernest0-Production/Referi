"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  VACANCY_SALARY_CURRENCY_VALUES,
  type VacancySalaryCurrency,
  isVacancySalaryCurrency,
} from "@/lib/vacancySalaryCurrency";
import {
  GradeIcon,
  SalaryCurrencyIcon,
  SpecialtyIcon,
  WorkFormatIcon,
} from "@/components/vacancy/VacancyFieldIcons";
import { useReportVacancyDashboardFormDirty } from "./VacancyDashboardFormDirtyContext";
import {
  formatRuMoneyIntegerDisplay,
  parseMoneyIntegerDigitsToNumber,
  sanitizeMoneyIntegerDigits,
} from "@/lib/moneyIntegerInput";
import {
  clearVacancyCreateDraft,
  loadVacancyCreateDraft,
  saveVacancyCreateDraft,
} from "@/lib/vacancyCreateDraftStorage";

const SPECIALTIES = [
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

const SPECIALTY_LABELS: Record<(typeof SPECIALTIES)[number], string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  IOS_MOBILE: "iOS",
  ANDROID_MOBILE: "Android",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML / AI",
  SECURITY: "Security",
};
const GRADES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD"] as const;
const FORMATS = ["OFFICE", "HYBRID", "REMOTE"] as const;

const GRADE_LABELS: Record<(typeof GRADES)[number], string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
};

const FORMAT_LABELS: Record<(typeof FORMATS)[number], string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

const REFERRER_BONUS_MAX_RUBLES = 100_000;
const REFERRER_BONUS_STEP_RUBLES = 10_000;
const VACANCY_DESCRIPTION_MAX_LEN = 1000;

function snapReferrerBonusRublesFromKopecks(raw: string): number {
  const kopecks = BigInt(raw || "0");
  const rubles = Number(kopecks / 100n);
  const clamped = Math.min(REFERRER_BONUS_MAX_RUBLES, Math.max(0, rubles));
  return Math.round(clamped / REFERRER_BONUS_STEP_RUBLES) * REFERRER_BONUS_STEP_RUBLES;
}

function snapReferrerBonusRubles(rubles: number): number {
  const clamped = Math.min(REFERRER_BONUS_MAX_RUBLES, Math.max(0, rubles));
  return Math.round(clamped / REFERRER_BONUS_STEP_RUBLES) * REFERRER_BONUS_STEP_RUBLES;
}

export type EditVacancyFormVacancy = {
  id: string;
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  salaryCurrency: VacancySalaryCurrency;
  salaryFromKopecks: string | null;
  salaryToKopecks: string | null;
  description: string;
  rewardKopecks: string;
};

function initialFormState(
  mode: "create" | "edit",
  vacancy?: EditVacancyFormVacancy,
): {
  title: string;
  companyName: string;
  specialty: (typeof SPECIALTIES)[number];
  grade: (typeof GRADES)[number];
  workFormat: (typeof FORMATS)[number];
  salaryCurrency: VacancySalaryCurrency;
  salaryFrom: string;
  salaryTo: string;
  description: string;
  referrerBonusRubles: number;
} {
  if (mode === "edit" && vacancy) {
    const fromRub =
      vacancy.salaryFromKopecks != null && vacancy.salaryFromKopecks !== ""
        ? String(Math.round(Number(vacancy.salaryFromKopecks) / 100))
        : "";
    const toRub =
      vacancy.salaryToKopecks != null && vacancy.salaryToKopecks !== ""
        ? String(Math.round(Number(vacancy.salaryToKopecks) / 100))
        : "";
    return {
      title: vacancy.title,
      companyName: vacancy.companyName,
      specialty: vacancy.specialty as (typeof SPECIALTIES)[number],
      grade: vacancy.grade as (typeof GRADES)[number],
      workFormat: vacancy.workFormat as (typeof FORMATS)[number],
      salaryCurrency: vacancy.salaryCurrency,
      salaryFrom: fromRub,
      salaryTo: toRub,
      description: vacancy.description,
      referrerBonusRubles: snapReferrerBonusRublesFromKopecks(vacancy.rewardKopecks),
    };
  }
  return {
    title: "",
    companyName: "",
    specialty: "BACKEND",
    grade: "MIDDLE",
    workFormat: "REMOTE",
    salaryCurrency: "RUB",
    salaryFrom: "",
    salaryTo: "",
    description: "",
    referrerBonusRubles: 0,
  };
}

type VacancyFormState = ReturnType<typeof initialFormState>;

type VacancyFieldFocusId = "vac-title" | "vac-company" | "vac-sal-from" | "vac-sal-to" | "vac-desc";

function focusVacancyFormField(id: VacancyFieldFocusId) {
  const el = document.getElementById(id);
  if (!el || !("focus" in el)) return;
  (el as HTMLElement).focus();
  (el as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
}

type SalaryRangeInvalid = { message: string; focusId: "vac-sal-from" | "vac-sal-to" };

/** Ошибка диапазона зарплаты или null, если всё ок. */
function validateSalaryRange(fromRaw: string, toRaw: string): SalaryRangeInvalid | null {
  const fromDigits = sanitizeMoneyIntegerDigits(fromRaw);
  const toDigits = sanitizeMoneyIntegerDigits(toRaw);
  const from = parseMoneyIntegerDigitsToNumber(fromDigits);
  const to = parseMoneyIntegerDigitsToNumber(toDigits);
  const fromTouched = fromDigits !== "";
  const toTouched = toDigits !== "";

  if (fromTouched && from === null) {
    return {
      message: "В поле «Зарплата от» укажите целое неотрицательное число.",
      focusId: "vac-sal-from",
    };
  }
  if (toTouched && to === null) {
    return {
      message: "В поле «Зарплата до» укажите целое неотрицательное число.",
      focusId: "vac-sal-to",
    };
  }
  if (from !== null && from < 0) {
    return { message: "Зарплата «от» не может быть отрицательной.", focusId: "vac-sal-from" };
  }
  if (to !== null && to < 0) {
    return { message: "Зарплата «до» не может быть отрицательной.", focusId: "vac-sal-to" };
  }
  if (from !== null && to !== null && from >= to) {
    return {
      message: "Минимальная зарплата не может быть меньше максимальной",
      focusId: "vac-sal-from",
    };
  }
  return null;
}

function isVacancyFormDirty(current: VacancyFormState, baseline: VacancyFormState): boolean {
  return (
    current.title !== baseline.title ||
    current.companyName !== baseline.companyName ||
    current.specialty !== baseline.specialty ||
    current.grade !== baseline.grade ||
    current.workFormat !== baseline.workFormat ||
    current.salaryCurrency !== baseline.salaryCurrency ||
    current.salaryFrom !== baseline.salaryFrom ||
    current.salaryTo !== baseline.salaryTo ||
    current.description !== baseline.description ||
    current.referrerBonusRubles !== baseline.referrerBonusRubles
  );
}

type CreateVacancyFormProps =
  | { mode?: "create"; onDirtyChange?: (dirty: boolean) => void }
  | {
      mode: "edit";
      vacancy: EditVacancyFormVacancy;
      onDirtyChange?: (dirty: boolean) => void;
    };

function isEditVacancyFormProps(
  props: CreateVacancyFormProps,
): props is { mode: "edit"; vacancy: EditVacancyFormVacancy } {
  return props.mode === "edit";
}

export function CreateVacancyForm(props: CreateVacancyFormProps) {
  const mode = isEditVacancyFormProps(props) ? "edit" : "create";
  const vacancy = isEditVacancyFormProps(props) ? props.vacancy : undefined;
  const onDirtyChange = props.onDirtyChange;
  const reportDashboardDirty = useReportVacancyDashboardFormDirty();

  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [form, setForm] = useState(() => initialFormState(mode, vacancy));
  const [authRedirectPending, setAuthRedirectPending] = useState(false);
  const draftRestoredRef = useRef(false);

  const editBaseline = useMemo((): VacancyFormState | null => {
    if (!vacancy || mode !== "edit") return null;
    return initialFormState("edit", vacancy);
    // Baseline — снимок при открытии; не привязываем к ссылке на объект vacancy от родителя.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчёт только при смене id карточки
  }, [mode, vacancy?.id]);

  const createBaseline = useMemo(() => initialFormState("create"), []);

  useEffect(() => {
    let dirty = false;
    if (mode === "edit") {
      if (!editBaseline) return;
      dirty = isVacancyFormDirty(form, editBaseline);
    } else {
      dirty = isVacancyFormDirty(form, createBaseline);
    }
    onDirtyChange?.(dirty);
    reportDashboardDirty?.(dirty);
  }, [form, mode, editBaseline, createBaseline, onDirtyChange, reportDashboardDirty]);

  useEffect(() => {
    if (mode !== "create" || draftRestoredRef.current) return;
    const draft = loadVacancyCreateDraft();
    if (!draft) return;
    draftRestoredRef.current = true;
    const base = initialFormState("create");
    const specialty = (SPECIALTIES as readonly string[]).includes(draft.specialty)
      ? (draft.specialty as (typeof SPECIALTIES)[number])
      : base.specialty;
    const grade = (GRADES as readonly string[]).includes(draft.grade)
      ? (draft.grade as (typeof GRADES)[number])
      : base.grade;
    const workFormat = (FORMATS as readonly string[]).includes(draft.workFormat)
      ? (draft.workFormat as (typeof FORMATS)[number])
      : base.workFormat;
    const salaryCurrency = isVacancySalaryCurrency(draft.salaryCurrency)
      ? draft.salaryCurrency
      : base.salaryCurrency;
    const next: VacancyFormState = {
      ...base,
      title: draft.title,
      companyName: draft.companyName,
      specialty,
      grade,
      workFormat,
      salaryCurrency,
      salaryFrom: draft.salaryFrom,
      salaryTo: draft.salaryTo,
      description: draft.description,
      referrerBonusRubles: snapReferrerBonusRubles(draft.referrerBonusRubles),
    };
    queueMicrotask(() => {
      setForm(next);
    });
  }, [mode]);

  const create = trpcReact.vacancies.create.useMutation({
    onSuccess() {
      clearVacancyCreateDraft();
      if (pathname === "/vacancies/new") {
        router.replace("/dashboard/vacancy");
      } else {
        router.refresh();
      }
    },
    onError(err) {
      setSubmitError(err.message);
    },
  });

  const update = trpcReact.vacancies.update.useMutation({
    onSuccess() {
      router.replace("/dashboard/vacancy");
      router.refresh();
    },
    onError(err) {
      setSubmitError(err.message);
    },
  });

  const pending = mode === "edit" ? update.isPending : create.isPending;
  const submitBlocked =
    pending || authRedirectPending || (mode === "create" && sessionStatus === "loading");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setTitleError(null);
    setCompanyError(null);
    setDescriptionError(null);
    setSalaryError(null);

    const salaryInvalid = validateSalaryRange(form.salaryFrom, form.salaryTo);
    if (salaryInvalid) {
      flushSync(() => setSalaryError(salaryInvalid.message));
      focusVacancyFormField(salaryInvalid.focusId);
      return;
    }

    const titleTrim = form.title.trim();
    if (titleTrim.length < 3) {
      flushSync(() => setTitleError("Введите название (минимум 3 символа)."));
      focusVacancyFormField("vac-title");
      return;
    }
    if (titleTrim.length > 200) {
      flushSync(() => setTitleError("Не более 200 символов."));
      focusVacancyFormField("vac-title");
      return;
    }

    const companyTrim = form.companyName.trim();
    if (companyTrim.length < 2) {
      flushSync(() => setCompanyError("Введите компанию (минимум 2 символа)."));
      focusVacancyFormField("vac-company");
      return;
    }
    if (companyTrim.length > 200) {
      flushSync(() => setCompanyError("Не более 200 символов."));
      focusVacancyFormField("vac-company");
      return;
    }

    const descTrim = form.description.trim();
    if (descTrim.length < 10) {
      flushSync(() => setDescriptionError("Описание должно содержать минимум 10 символов."));
      focusVacancyFormField("vac-desc");
      return;
    }
    if (descTrim.length > VACANCY_DESCRIPTION_MAX_LEN) {
      flushSync(() =>
        setDescriptionError(
          `Не более ${VACANCY_DESCRIPTION_MAX_LEN.toLocaleString("ru-RU")} символов.`,
        ),
      );
      focusVacancyFormField("vac-desc");
      return;
    }

    if (mode === "create") {
      if (sessionStatus === "loading") return;
      if (!session?.user) {
        saveVacancyCreateDraft({
          title: form.title,
          companyName: form.companyName,
          specialty: form.specialty,
          grade: form.grade,
          workFormat: form.workFormat,
          salaryCurrency: form.salaryCurrency,
          salaryFrom: form.salaryFrom,
          salaryTo: form.salaryTo,
          description: form.description,
          referrerBonusRubles: form.referrerBonusRubles,
        });
        setAuthRedirectPending(true);
        void signIn("github", { callbackUrl: "/dashboard/vacancy" });
        return;
      }
    }

    const fromDigits = sanitizeMoneyIntegerDigits(form.salaryFrom);
    const toDigits = sanitizeMoneyIntegerDigits(form.salaryTo);

    const payload = {
      title: titleTrim,
      companyName: companyTrim,
      specialty: form.specialty,
      grade: form.grade,
      workFormat: form.workFormat,
      salaryCurrency: form.salaryCurrency,
      salaryFrom: fromDigits === "" ? undefined : Number(BigInt(fromDigits)),
      salaryTo: toDigits === "" ? undefined : Number(BigInt(toDigits)),
      description: descTrim,
      rewardKopecks: form.referrerBonusRubles * 100,
    };
    if (mode === "edit" && vacancy) {
      update.mutate({ id: vacancy.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={titleError ? "true" : undefined}>
            <FieldLabel htmlFor="vac-title">Название рефералки *</FieldLabel>
            <Input
              id="vac-title"
              maxLength={200}
              value={form.title}
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "vac-title-desc" : undefined}
              onChange={(e) => {
                setTitleError(null);
                setForm((f) => ({ ...f, title: e.target.value }));
              }}
              placeholder="Senior Backend Engineer"
            />
            {titleError ? (
              <FieldDescription id="vac-title-desc" className="text-destructive">
                {titleError}
              </FieldDescription>
            ) : null}
          </Field>
          <Field data-invalid={companyError ? "true" : undefined}>
            <FieldLabel htmlFor="vac-company">Компания *</FieldLabel>
            <Input
              id="vac-company"
              maxLength={200}
              value={form.companyName}
              aria-invalid={companyError ? true : undefined}
              aria-describedby={companyError ? "vac-company-desc" : undefined}
              onChange={(e) => {
                setCompanyError(null);
                setForm((f) => ({ ...f, companyName: e.target.value }));
              }}
              placeholder="ООО Пример"
            />
            {companyError ? (
              <FieldDescription id="vac-company-desc" className="text-destructive">
                {companyError}
              </FieldDescription>
            ) : null}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Специальность</FieldLabel>
            <Select
              value={form.specialty}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, specialty: v as (typeof SPECIALTIES)[number] }))
              }
            >
              <SelectTrigger className="w-full">
                <SpecialtyIcon specialty={form.specialty} />
                <SelectValue className="min-w-0">{SPECIALTY_LABELS[form.specialty]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s} textValue={SPECIALTY_LABELS[s]}>
                      <span className="flex items-center gap-2">
                        <SpecialtyIcon specialty={s} />
                        {SPECIALTY_LABELS[s]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Грейд</FieldLabel>
            <Select
              value={form.grade}
              onValueChange={(v) => setForm((f) => ({ ...f, grade: v as (typeof GRADES)[number] }))}
            >
              <SelectTrigger className="w-full *:data-[slot=select-value]:flex-1 *:data-[slot=select-value]:justify-center">
                <GradeIcon />
                <SelectValue className="min-w-0">{GRADE_LABELS[form.grade]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g} textValue={GRADE_LABELS[g]}>
                      {GRADE_LABELS[g]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Формат</FieldLabel>
            <Select
              value={form.workFormat}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, workFormat: v as (typeof FORMATS)[number] }))
              }
            >
              <SelectTrigger className="w-full">
                <WorkFormatIcon format={form.workFormat} />
                <SelectValue className="min-w-0">{FORMAT_LABELS[form.workFormat]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f} textValue={FORMAT_LABELS[f]}>
                      <span className="flex items-center gap-2">
                        <WorkFormatIcon format={f} />
                        {FORMAT_LABELS[f]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <FieldSet
          className="flex min-w-0 flex-col gap-2"
          data-invalid={salaryError ? "true" : undefined}
        >
          <FieldLegend>Зарплата</FieldLegend>
          <InputGroup className="border-border bg-card w-full min-w-0 rounded-lg shadow-sm">
            <InputGroupInput
              id="vac-sal-from"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Зарплата от"
              value={formatRuMoneyIntegerDisplay(form.salaryFrom)}
              aria-invalid={salaryError ? true : undefined}
              aria-describedby={salaryError ? "vac-salary-desc" : undefined}
              onChange={(e) => {
                setSalaryError(null);
                setForm((f) => ({
                  ...f,
                  salaryFrom: sanitizeMoneyIntegerDigits(e.target.value),
                }));
              }}
              placeholder="100 000"
              className="min-w-0 flex-1 tabular-nums"
            />
            <InputGroupText
              className="text-muted-foreground shrink-0 px-1 text-base font-medium tabular-nums select-none"
              aria-hidden="true"
            >
              –
            </InputGroupText>
            <InputGroupInput
              id="vac-sal-to"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Зарплата до"
              value={formatRuMoneyIntegerDisplay(form.salaryTo)}
              aria-invalid={salaryError ? true : undefined}
              aria-describedby={salaryError ? "vac-salary-desc" : undefined}
              onChange={(e) => {
                setSalaryError(null);
                setForm((f) => ({
                  ...f,
                  salaryTo: sanitizeMoneyIntegerDigits(e.target.value),
                }));
              }}
              placeholder="200 000"
              className="min-w-0 flex-1 tabular-nums"
            />
            <InputGroupAddon align="inline-end" className="shrink-0 pr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <InputGroupButton
                    variant="ghost"
                    type="button"
                    id="vac-sal-currency"
                    aria-label="Валюта зарплаты"
                    aria-invalid={salaryError ? true : undefined}
                    aria-describedby={salaryError ? "vac-salary-desc" : undefined}
                    className="h-8 max-w-full min-w-0 gap-1.5 rounded-lg px-2 font-medium tabular-nums"
                  >
                    <SalaryCurrencyIcon code={form.salaryCurrency} />
                    <span className="min-w-0">{form.salaryCurrency}</span>
                    <ChevronDown className="text-muted-foreground size-3.5 shrink-0 opacity-80" />
                  </InputGroupButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={form.salaryCurrency}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, salaryCurrency: v as VacancySalaryCurrency }))
                    }
                  >
                    {VACANCY_SALARY_CURRENCY_VALUES.map((c) => (
                      <DropdownMenuRadioItem key={c} value={c} className="gap-2">
                        <SalaryCurrencyIcon code={c} />
                        {c}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </InputGroupAddon>
          </InputGroup>
          {salaryError ? (
            <FieldDescription id="vac-salary-desc" className="text-destructive">
              {salaryError}
            </FieldDescription>
          ) : null}
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="vac-reward">
            <span className="text-emerald-600 dark:text-emerald-400">Компенсация</span> реферальщику
            (₽)
          </FieldLabel>
          <div className="flex flex-col gap-3 pt-0.5">
            <div
              id="vac-reward-summary"
              className="text-foreground flex items-baseline justify-between gap-4 text-sm font-medium tabular-nums"
              aria-live="polite"
            >
              <span>
                {form.referrerBonusRubles === 0 ? (
                  "Бесплатно"
                ) : (
                  <>
                    {form.referrerBonusRubles.toLocaleString("ru-RU")}{" "}
                    <span className="text-muted-foreground">₽</span>
                  </>
                )}
              </span>
              <span className="text-muted-foreground shrink-0 font-normal tabular-nums">
                {REFERRER_BONUS_MAX_RUBLES.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <Slider
              id="vac-reward"
              min={0}
              max={REFERRER_BONUS_MAX_RUBLES}
              step={REFERRER_BONUS_STEP_RUBLES}
              value={[form.referrerBonusRubles]}
              onValueChange={(v) => {
                const next = v[0];
                if (next === undefined) return;
                setForm((f) => ({ ...f, referrerBonusRubles: next }));
              }}
              aria-describedby="vac-reward-summary"
              aria-valuetext={
                form.referrerBonusRubles === 0
                  ? "Бесплатно"
                  : `${form.referrerBonusRubles.toLocaleString("ru-RU")} ₽`
              }
            />
          </div>
        </Field>

        <Field data-invalid={descriptionError ? "true" : undefined}>
          <FieldLabel htmlFor="vac-desc">Описание *</FieldLabel>
          <div className="relative">
            <Textarea
              id="vac-desc"
              maxLength={VACANCY_DESCRIPTION_MAX_LEN}
              rows={18}
              className="min-h-48 pb-9"
              value={form.description}
              aria-invalid={descriptionError ? true : undefined}
              aria-describedby={
                [descriptionError ? "vac-desc-desc" : null, "vac-desc-counter"]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={(e) => {
                setDescriptionError(null);
                setForm((f) => ({ ...f, description: e.target.value }));
              }}
              placeholder="Расскажите о рефералке, требованиях и условиях работы"
            />
            <span
              id="vac-desc-counter"
              className="text-muted-foreground pointer-events-none absolute right-3 bottom-2 text-xs tabular-nums"
              aria-live="polite"
            >
              Осталось{" "}
              {(VACANCY_DESCRIPTION_MAX_LEN - form.description.length).toLocaleString("ru-RU")}
            </span>
          </div>
          {descriptionError ? (
            <FieldDescription id="vac-desc-desc" className="text-destructive">
              {descriptionError}
            </FieldDescription>
          ) : null}
        </Field>

        {submitError ? (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={submitBlocked}
          className="h-11 w-full text-base font-semibold"
        >
          {authRedirectPending
            ? "Переход к входу…"
            : pending
              ? mode === "edit"
                ? "Сохранение…"
                : "Публикация…"
              : mode === "edit"
                ? "Сохранить"
                : "Опубликовать рефералку"}
        </Button>
      </FieldGroup>
    </form>
  );
}
