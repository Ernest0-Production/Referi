"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFilter } from "@tabler/icons-react";
import { RotateCcw, Save } from "lucide-react";
import {
  mergeVacancyListQueryParams,
  parseCsvEnumParam,
  presetParamsFromJson,
  serializeCsvParam,
  flatParamsForPresetSave,
  type VacancyListFlatSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_SPECIALTY_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
  vacancyListFlatToSearchParams,
} from "@/lib/vacancyListQuery";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SPECIALTY_SELECT_ANY = "__any__";
const SPECIALTY_SELECT_MULTI = "__multi__";

const SPECIALTIES: { value: (typeof VACANCY_LIST_SPECIALTY_VALUES)[number]; label: string }[] = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "FULLSTACK", label: "Fullstack" },
  { value: "MOBILE", label: "Mobile" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "QA", label: "QA" },
  { value: "DATA", label: "Data" },
  { value: "ML_AI", label: "ML / AI" },
  { value: "SECURITY", label: "Security" },
  { value: "OTHER", label: "Другое" },
];

const GRADES: { value: (typeof VACANCY_LIST_GRADE_VALUES)[number]; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const FORMATS: { value: (typeof VACANCY_LIST_WORK_FORMAT_VALUES)[number]; label: string }[] = [
  { value: "REMOTE", label: "Удалённо" },
  { value: "HYBRID", label: "Гибрид" },
  { value: "OFFICE", label: "Офис" },
];

interface PresetRow {
  id: string;
  name: string;
  params: unknown;
}

interface Props {
  currentParams: VacancyListFlatSearchParams;
  listPath?: string;
  presets: PresetRow[];
  isLoggedIn: boolean;
}

export function VacancyFilters({ currentParams, listPath = "/", presets, isLoggedIn }: Props) {
  const router = useRouter();
  const [salaryFrom, setSalaryFrom] = useState(currentParams.salaryFrom ?? "");
  const [saveOpen, setSaveOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetNameInvalid, setPresetNameInvalid] = useState(false);
  const utils = trpcReact.useUtils();

  const createPreset = trpcReact.vacancySearchPresets.create.useMutation({
    onSuccess: async () => {
      toast.success("Фильтр сохранён");
      setSaveOpen(false);
      setPresetName("");
      setPresetNameInvalid(false);
      await utils.vacancySearchPresets.list.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message || "Не удалось сохранить"),
  });

  function apply(patch: Partial<VacancyListFlatSearchParams>) {
    const q = mergeVacancyListQueryParams(currentParams, patch);
    const qs = q.toString();
    router.push(`${listPath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function applyPresetSelection(presetId: string) {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    const patch = presetParamsFromJson(p.params);
    const q = vacancyListFlatToSearchParams({ ...patch, page: "1" });
    const qs = q.toString();
    router.push(`${listPath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  const specialtyValues =
    parseCsvEnumParam(currentParams.specialty, VACANCY_LIST_SPECIALTY_VALUES) ?? [];
  const specialtySelectValue =
    specialtyValues.length === 0
      ? SPECIALTY_SELECT_ANY
      : specialtyValues.length === 1
        ? specialtyValues[0]
        : SPECIALTY_SELECT_MULTI;
  const gradeValues = parseCsvEnumParam(currentParams.grade, VACANCY_LIST_GRADE_VALUES) ?? [];
  const formatValues =
    parseCsvEnumParam(currentParams.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES) ?? [];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <IconFilter className="size-5 shrink-0" aria-hidden stroke={1.75} />
          Фильтры
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-foreground text-sm font-medium">Ваши фильтры</Label>
            {presets.length > 0 ? (
              <span className="text-muted-foreground text-xs">{presets.length} сохранённых</span>
            ) : null}
          </div>
          {!isLoggedIn ? (
            <Alert>
              <AlertDescription className="text-sm">
                <Link
                  href="/login"
                  className="text-primary font-medium underline underline-offset-4"
                >
                  Войдите
                </Link>
                , чтобы сохранять наборы фильтров.
              </AlertDescription>
            </Alert>
          ) : (
            <Select disabled={presets.length === 0} onValueChange={applyPresetSelection}>
              <SelectTrigger className="bg-card h-9 w-full rounded-lg">
                <SelectValue placeholder={presets.length ? "Выберите фильтр" : "Нет сохранённых"} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Специализация</Label>
          <Select
            value={specialtySelectValue}
            onValueChange={(next) => {
              if (next === SPECIALTY_SELECT_MULTI) return;
              if (next === SPECIALTY_SELECT_ANY) {
                apply({ specialty: undefined });
                return;
              }
              apply({ specialty: next });
            }}
          >
            <SelectTrigger className="bg-card h-9 w-full rounded-lg">
              <SelectValue placeholder="Специализация" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SPECIALTY_SELECT_ANY}>Любая</SelectItem>
              {specialtyValues.length > 1 ? (
                <SelectItem value={SPECIALTY_SELECT_MULTI}>Несколько выбрано</SelectItem>
              ) : null}
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Грейд</Label>
          <ToggleGroup
            type="multiple"
            spacing={2}
            value={gradeValues}
            onValueChange={(next) => {
              apply({ grade: next.length ? serializeCsvParam(next) : undefined });
            }}
            className="flex flex-wrap justify-start"
          >
            {GRADES.map((g) => (
              <ToggleGroupItem key={g.value} value={g.value} variant="outline" size="sm">
                {g.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">Формат работы</Label>
          <ToggleGroup
            type="multiple"
            spacing={2}
            value={formatValues}
            onValueChange={(next) => {
              apply({ workFormat: next.length ? serializeCsvParam(next) : undefined });
            }}
            className="flex flex-wrap justify-start"
          >
            {FORMATS.map((f) => (
              <ToggleGroupItem key={f.value} value={f.value} variant="outline" size="sm">
                {f.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="salary-from">Зарплата не ниже (₽)</FieldLabel>
            <Input
              id="salary-from"
              type="number"
              min={0}
              value={salaryFrom}
              onChange={(e) => setSalaryFrom(e.target.value)}
              onBlur={() => apply({ salaryFrom: salaryFrom.trim() || undefined })}
              placeholder="Минимум"
              className="h-9 rounded-lg"
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="border-border flex flex-col gap-3 border-t px-4 py-4">
        <div className="flex w-full items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => router.push(listPath, { scroll: false })}
            aria-label="Сбросить фильтры"
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            className={cn(
              "h-10 min-w-0 flex-1 gap-2 rounded-xl font-semibold",
              "bg-[var(--app-nav-cta-bg)] text-[var(--app-nav-cta-fg)] hover:bg-[var(--app-nav-cta-hover)]",
            )}
            disabled={!isLoggedIn}
            onClick={() => {
              if (!isLoggedIn) return;
              setSaveOpen(true);
            }}
          >
            <Save />
            Сохранить
          </Button>
        </div>
      </CardFooter>

      <Dialog
        open={saveOpen}
        onOpenChange={(open) => {
          setSaveOpen(open);
          setPresetNameInvalid(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сохранить фильтры</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={presetNameInvalid ? true : undefined}>
              <FieldLabel htmlFor="preset-name">Название</FieldLabel>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => {
                  setPresetName(e.target.value);
                  setPresetNameInvalid(false);
                }}
                maxLength={80}
                placeholder="Например: Удалённый бэкенд"
                className="h-9"
                aria-invalid={presetNameInvalid}
              />
              {presetNameInvalid ? (
                <FieldDescription className="text-destructive">Введите название</FieldDescription>
              ) : null}
            </Field>
          </FieldGroup>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => {
                const name = presetName.trim();
                if (!name) {
                  setPresetNameInvalid(true);
                  return;
                }
                createPreset.mutate({
                  name,
                  params: flatParamsForPresetSave(currentParams),
                });
              }}
              disabled={createPreset.isPending}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
