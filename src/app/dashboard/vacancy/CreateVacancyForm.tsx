"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
} from "@/lib/vacancySalaryCurrency";
import {
  GradeIcon,
  SalaryCurrencyIcon,
  SpecialtyIcon,
  WorkFormatIcon,
} from "@/components/vacancy/VacancyFieldIcons";
import {
  formatRuMoneyIntegerDisplay,
  parseMoneyIntegerDigitsToNumber,
  sanitizeMoneyIntegerDigits,
} from "@/lib/moneyIntegerInput";

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
  "OTHER",
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
  OTHER: "Другое",
};
const GRADES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;
const FORMATS = ["OFFICE", "HYBRID", "REMOTE"] as const;

const GRADE_LABELS: Record<(typeof GRADES)[number], string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<(typeof FORMATS)[number], string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

const REFERRER_BONUS_MAX_RUBLES = 100_000;
const REFERRER_BONUS_STEP_RUBLES = 10_000;

function snapReferrerBonusRublesFromKopecks(raw: string): number {
  const kopecks = BigInt(raw || "0");
  const rubles = Number(kopecks / 100n);
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

/** Сообщение об ошибке или null, если всё ок. */
function validateSalaryRange(fromRaw: string, toRaw: string): string | null {
  const fromDigits = sanitizeMoneyIntegerDigits(fromRaw);
  const toDigits = sanitizeMoneyIntegerDigits(toRaw);
  const from = parseMoneyIntegerDigitsToNumber(fromDigits);
  const to = parseMoneyIntegerDigitsToNumber(toDigits);
  const fromTouched = fromDigits !== "";
  const toTouched = toDigits !== "";

  if (fromTouched && from === null) {
    return "В поле «Зарплата от» укажите целое неотрицательное число.";
  }
  if (toTouched && to === null) {
    return "В поле «Зарплата до» укажите целое неотрицательное число.";
  }
  if (from !== null && from < 0) {
    return "Зарплата «от» не может быть отрицательной.";
  }
  if (to !== null && to < 0) {
    return "Зарплата «до» не может быть отрицательной.";
  }
  if (from !== null && to !== null && from >= to) {
    return "«Зарплата от» должна быть меньше «Зарплаты до».";
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
  | { mode?: "create" }
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
  const onDirtyChange = isEditVacancyFormProps(props) ? props.onDirtyChange : undefined;

  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => initialFormState(mode, vacancy));

  const editBaseline = useMemo((): VacancyFormState | null => {
    if (!vacancy || mode !== "edit") return null;
    return initialFormState("edit", vacancy);
    // Baseline — снимок при открытии; не привязываем к ссылке на объект vacancy от родителя.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- пересчёт только при смене вакансии (id)
  }, [mode, vacancy?.id]);

  useEffect(() => {
    if (!editBaseline || !onDirtyChange) return;
    onDirtyChange(isVacancyFormDirty(form, editBaseline));
  }, [form, editBaseline, onDirtyChange]);

  const create = trpcReact.vacancies.create.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      setError(err.message);
    },
  });

  const update = trpcReact.vacancies.update.useMutation({
    onSuccess() {
      router.replace("/dashboard/vacancy");
      router.refresh();
    },
    onError(err) {
      setError(err.message);
    },
  });

  const pending = mode === "edit" ? update.isPending : create.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const salaryErr = validateSalaryRange(form.salaryFrom, form.salaryTo);
    if (salaryErr) {
      setError(salaryErr);
      return;
    }

    const fromDigits = sanitizeMoneyIntegerDigits(form.salaryFrom);
    const toDigits = sanitizeMoneyIntegerDigits(form.salaryTo);

    const payload = {
      title: form.title,
      companyName: form.companyName,
      specialty: form.specialty,
      grade: form.grade,
      workFormat: form.workFormat,
      salaryCurrency: form.salaryCurrency,
      salaryFrom: fromDigits === "" ? undefined : Number(BigInt(fromDigits)),
      salaryTo: toDigits === "" ? undefined : Number(BigInt(toDigits)),
      description: form.description,
      rewardKopecks: form.referrerBonusRubles * 100,
    };
    if (mode === "edit" && vacancy) {
      update.mutate({ id: vacancy.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vac-title">Название вакансии *</FieldLabel>
            <Input
              id="vac-title"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Senior Backend Engineer"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vac-company">Компания *</FieldLabel>
            <Input
              id="vac-company"
              required
              minLength={2}
              maxLength={200}
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="ООО Пример"
            />
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
                      <span className="flex items-center gap-2">
                        <GradeIcon className="size-4" />
                        {GRADE_LABELS[g]}
                      </span>
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

        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor="vac-sal-from">Зарплата от</FieldLabel>
            <Input
              id="vac-sal-from"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatRuMoneyIntegerDisplay(form.salaryFrom)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  salaryFrom: sanitizeMoneyIntegerDigits(e.target.value),
                }))
              }
              placeholder="100 000"
              className="tabular-nums"
            />
          </Field>
          <Field className="min-w-0 flex-1">
            <FieldLabel htmlFor="vac-sal-to">Зарплата до</FieldLabel>
            <Input
              id="vac-sal-to"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatRuMoneyIntegerDisplay(form.salaryTo)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  salaryTo: sanitizeMoneyIntegerDigits(e.target.value),
                }))
              }
              placeholder="200 000"
              className="tabular-nums"
            />
          </Field>
          <Field className="w-full min-w-0 shrink-0 sm:w-fit">
            <FieldLabel>Валюта зарплаты</FieldLabel>
            <Select
              value={form.salaryCurrency}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, salaryCurrency: v as VacancySalaryCurrency }))
              }
            >
              <SelectTrigger className="h-8 max-w-full min-w-0 gap-1.5 font-medium tabular-nums">
                <SalaryCurrencyIcon code={form.salaryCurrency} />
                <SelectValue className="min-w-0">{form.salaryCurrency}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {VACANCY_SALARY_CURRENCY_VALUES.map((c) => (
                    <SelectItem key={c} value={c} textValue={c}>
                      <span className="flex items-center gap-2">
                        <SalaryCurrencyIcon code={c} />
                        {c}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="vac-reward">
            <span className="text-emerald-600 dark:text-emerald-400">Бонус</span> реферальщику (₽)
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
                {REFERRER_BONUS_MAX_RUBLES.toLocaleString("ru-RU")} руб.
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
                  : `${form.referrerBonusRubles.toLocaleString("ru-RU")} рублей`
              }
            />
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="vac-desc">Описание *</FieldLabel>
          <Textarea
            id="vac-desc"
            required
            minLength={10}
            maxLength={3000}
            rows={18}
            className="min-h-48"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Расскажите о вакансии, требованиях и условиях работы"
          />
        </Field>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 w-full text-base font-semibold"
        >
          {pending
            ? mode === "edit"
              ? "Сохранение…"
              : "Публикация…"
            : mode === "edit"
              ? "Сохранить"
              : "Опубликовать вакансию"}
        </Button>
      </FieldGroup>
    </form>
  );
}
