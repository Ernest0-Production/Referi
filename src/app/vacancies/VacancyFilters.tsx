"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFilter } from "@tabler/icons-react";
import { ChevronDown, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  parseCsvEnumParam,
  presetParamsFromJson,
  serializeCsvParam,
  flatParamsForPresetSave,
  isVacancyFlatMatchingPresetParams,
  type VacancyListFlatSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_SPECIALTY_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
} from "@/lib/vacancyListQuery";
import {
  isVacancySalaryCurrency,
  VACANCY_SALARY_CURRENCY_VALUES,
  type VacancySalaryCurrency,
} from "@/lib/vacancySalaryCurrency";
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";

const SPECIALTY_SELECT_ANY = "__any__";
const SPECIALTY_SELECT_MULTI = "__multi__";
const PRESET_SELECT_CLEAR = "__preset_clear__";

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

function VacancyFilterSalaryBlock({
  committedSalary,
  committedSalaryCurrency,
  apply,
}: {
  committedSalary: string | undefined;
  committedSalaryCurrency: string | undefined;
  apply: (patch: Partial<VacancyListFlatSearchParams>) => void;
}) {
  const selectValueFromCommitted: VacancySalaryCurrency =
    committedSalaryCurrency && isVacancySalaryCurrency(committedSalaryCurrency)
      ? committedSalaryCurrency
      : "RUB";

  const [salaryFrom, setSalaryFrom] = useState(committedSalary ?? "");
  const [salaryCurrencySelect, setSalaryCurrencySelect] =
    useState<VacancySalaryCurrency>(selectValueFromCommitted);

  function commit(nextSalary: string | undefined, currency: VacancySalaryCurrency) {
    const trimmed = nextSalary?.trim();
    const hasSalary = Boolean(trimmed);
    if (!hasSalary) {
      if (currency === "RUB") {
        apply({ salaryFrom: undefined, salaryCurrency: undefined });
      } else {
        apply({ salaryFrom: undefined, salaryCurrency: currency });
      }
      return;
    }
    apply({ salaryFrom: trimmed, salaryCurrency: currency });
  }

  return (
    <FieldGroup>
      <FieldLabel htmlFor="salary-from">Зарплата не ниже</FieldLabel>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            id="salary-from"
            type="number"
            min={0}
            value={salaryFrom}
            onChange={(e) => setSalaryFrom(e.target.value)}
            onBlur={() => commit(salaryFrom.trim() || undefined, salaryCurrencySelect)}
            placeholder="Минимум"
            className="h-9 w-full min-w-0 rounded-lg"
          />
        </div>
        <div className="flex shrink-0 justify-end sm:justify-start">
          <Select
            value={salaryCurrencySelect}
            onValueChange={(v) => {
              const c = v as VacancySalaryCurrency;
              setSalaryCurrencySelect(c);
              commit(salaryFrom.trim() || undefined, c);
            }}
          >
            <SelectTrigger className="h-9 w-[4.75rem] shrink-0 gap-1 px-2 font-medium tabular-nums">
              <SelectValue placeholder="…" />
            </SelectTrigger>
            <SelectContent position="popper">
              {VACANCY_SALARY_CURRENCY_VALUES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </FieldGroup>
  );
}

interface PresetRow {
  id: string;
  name: string;
  params: unknown;
}

interface Props {
  currentParams: VacancyListFlatSearchParams;
  onApplyPatch: (patch: Partial<VacancyListFlatSearchParams>) => void;
  onReplaceFromPreset: (next: VacancyListFlatSearchParams) => void;
  onReset: () => void;
  presets: PresetRow[];
  isLoggedIn: boolean;
  /** Совпадение текущих параметров с сохранённым пресетом (без учёта «закреплённого» выбора). */
  matchedPresetId: string | undefined;
  /** Пресет, выбранный в UI или удерживаемый после правок до совпадения снова. */
  activePresetId: string | undefined;
  /** Только выбор строки в Select «Ваши фильтры» (не сброс каталога). */
  onPickSavedVacancyPreset: (id: string) => void;
  /** После сброса каталога: не показывать matched preset в Select, пока пользователь снова не выберет пункт. */
  vacancyPresetSidebarCleared?: boolean;
  /** Увеличивается при сбросе каталога — перемонтирование Select, чтобы Radix сбросил отображение. */
  savedPresetSelectLayoutKey?: number;
}

export function VacancyFilters({
  currentParams,
  onApplyPatch,
  onReplaceFromPreset,
  onReset,
  presets,
  isLoggedIn,
  matchedPresetId,
  activePresetId,
  onPickSavedVacancyPreset,
  vacancyPresetSidebarCleared = false,
  savedPresetSelectLayoutKey = 0,
}: Props) {
  const router = useRouter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetIdPendingDelete, setPresetIdPendingDelete] = useState<string | null>(null);
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

  const updatePreset = trpcReact.vacancySearchPresets.update.useMutation({
    onSuccess: async () => {
      toast.success("Фильтр обновлён");
      await utils.vacancySearchPresets.list.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message || "Не удалось обновить"),
  });

  const deletePreset = trpcReact.vacancySearchPresets.delete.useMutation({
    onSuccess: async () => {
      toast.success("Фильтр удалён");
      setDeleteConfirmOpen(false);
      setPresetIdPendingDelete(null);
      await utils.vacancySearchPresets.list.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message || "Не удалось удалить"),
  });

  function apply(patch: Partial<VacancyListFlatSearchParams>) {
    onApplyPatch(patch);
  }

  function applyPresetSelection(presetId: string) {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    const patch = presetParamsFromJson(p.params);
    onReplaceFromPreset({ page: "1", ...patch });
  }

  function handlePresetSelectChange(value: string) {
    if (value === PRESET_SELECT_CLEAR) {
      onReset();
      return;
    }
    onPickSavedVacancyPreset(value);
    applyPresetSelection(value);
  }

  const resolvedPresetId = vacancyPresetSidebarCleared
    ? undefined
    : (activePresetId ?? matchedPresetId);

  const resolvedPresetRow = useMemo(
    () => (resolvedPresetId ? presets.find((x) => x.id === resolvedPresetId) : undefined),
    [resolvedPresetId, presets],
  );

  const presetUpdateHasChanges =
    resolvedPresetRow != null &&
    !isVacancyFlatMatchingPresetParams(currentParams, resolvedPresetRow.params);

  const footerCtaMode = useMemo<"save" | "update" | "delete">(() => {
    if (!isLoggedIn || !resolvedPresetId) return "save";
    if (presetUpdateHasChanges) return "update";
    return "delete";
  }, [isLoggedIn, resolvedPresetId, presetUpdateHasChanges]);

  const pendingDeletePresetName = useMemo(() => {
    if (!presetIdPendingDelete) return "";
    return presets.find((p) => p.id === presetIdPendingDelete)?.name ?? "";
  }, [presetIdPendingDelete, presets]);

  const ctaButtonClass = cn(
    "h-10 gap-2 font-semibold shadow-none",
    "bg-[var(--app-nav-cta-bg)] text-[var(--app-nav-cta-fg)] hover:bg-[var(--app-nav-cta-hover)]",
  );

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
            <Select
              key={`saved-preset-select-${savedPresetSelectLayoutKey}-${vacancyPresetSidebarCleared ? "c" : "o"}-${resolvedPresetId ?? ""}`}
              value={resolvedPresetId}
              disabled={presets.length === 0}
              onValueChange={handlePresetSelectChange}
            >
              <SelectTrigger className="bg-card h-9 w-full rounded-lg">
                <SelectValue placeholder={presets.length ? "Выберите фильтр" : "Нет сохранённых"} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value={PRESET_SELECT_CLEAR}>Очистить выбор</SelectItem>
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

        <VacancyFilterSalaryBlock
          key={`${currentParams.salaryFrom ?? ""}|${currentParams.salaryCurrency ?? ""}`}
          committedSalary={currentParams.salaryFrom}
          committedSalaryCurrency={currentParams.salaryCurrency}
          apply={apply}
        />
      </CardContent>
      <CardFooter className="border-border flex flex-col gap-3 border-t px-4 py-4">
        <div className="flex w-full min-w-0 flex-1 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => onReset()}
            aria-label="Сбросить фильтры"
          >
            <RotateCcw />
          </Button>
          <div className="flex min-w-0 flex-1 items-stretch">
            {footerCtaMode === "save" ? (
              <Button
                type="button"
                variant="default"
                className={cn(ctaButtonClass, "min-w-0 flex-1 rounded-xl")}
                disabled={!isLoggedIn}
                onClick={() => {
                  if (!isLoggedIn) return;
                  setSaveOpen(true);
                }}
              >
                <Save />
                Сохранить
              </Button>
            ) : footerCtaMode === "update" ? (
              <div
                data-slot="button-group"
                className="flex min-w-0 flex-1 overflow-hidden rounded-xl"
              >
                <Button
                  type="button"
                  variant="default"
                  className={cn(ctaButtonClass, "min-w-0 flex-1 rounded-none rounded-l-xl")}
                  disabled={updatePreset.isPending}
                  onClick={() => {
                    const id = resolvedPresetId;
                    if (!id) return;
                    updatePreset.mutate({
                      id,
                      params: flatParamsForPresetSave(currentParams),
                    });
                  }}
                >
                  <RefreshCw className="size-4 shrink-0" />
                  Обновить
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      aria-label="Дополнительные действия с фильтром"
                      className={cn(
                        ctaButtonClass,
                        "size-10 w-10 shrink-0 rounded-none rounded-r-xl border-l border-[color-mix(in_srgb,var(--app-nav-cta-fg)_22%,transparent)]",
                      )}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-48">
                    <DropdownMenuItem
                      onSelect={() => {
                        setSaveOpen(true);
                      }}
                    >
                      Создать новый фильтр
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => {
                        if (!resolvedPresetId) return;
                        setPresetIdPendingDelete(resolvedPresetId);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Удалить фильтр
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                type="button"
                variant="destructive"
                className="h-10 min-w-0 flex-1 gap-2 rounded-xl font-semibold"
                disabled={deletePreset.isPending}
                onClick={() => {
                  if (!resolvedPresetId) return;
                  setPresetIdPendingDelete(resolvedPresetId);
                  setDeleteConfirmOpen(true);
                }}
              >
                <Trash2 className="size-4 shrink-0" />
                Удалить
              </Button>
            )}
          </div>
        </div>
      </CardFooter>

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setPresetIdPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Удалить фильтр?</DialogTitle>
            <DialogDescription>
              {pendingDeletePresetName ? (
                <>
                  Будет удалён сохранённый набор «{pendingDeletePresetName}». Текущие значения полей
                  в каталоге останутся как есть.
                </>
              ) : (
                "Будет удалён выбранный сохранённый набор фильтров."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPresetIdPendingDelete(null);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!presetIdPendingDelete || deletePreset.isPending}
              onClick={() => {
                if (!presetIdPendingDelete) return;
                deletePreset.mutate({ id: presetIdPendingDelete });
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
