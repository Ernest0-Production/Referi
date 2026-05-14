"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconFilter, IconStack2 } from "@tabler/icons-react";
import { ChevronDown, Copy, MoreVertical, RotateCcw, Save, Trash2, XIcon } from "lucide-react";
import {
  buildVacancyCatalogLoginReturnHref,
  flatParamsForPresetSave,
  isVacancyCatalogFlatBaseline,
  mergeVacancyListFlat,
  normalizedPresetParamsRecord,
  parseCsvEnumParam,
  parseVacancyListSpecialtyCsvParam,
  presetParamsFromJson,
  serializeCsvParam,
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
import {
  formatRuMoneyIntegerDisplay,
  sanitizeMoneyIntegerDigits,
  clampMoneyIntegerDigits,
} from "@/lib/moneyIntegerInput";
import { VACANCY_SALARY_AMOUNT_MAX } from "@/lib/vacancySalaryAmount";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetClose, SheetFooter, SheetTitle } from "@/components/ui/sheet";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogHotkeyKbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  GradeIcon,
  SalaryCurrencyIcon,
  SpecialtyIcon,
  WorkFormatIcon,
} from "@/components/vacancy/VacancyFieldIcons";
import { cn } from "@/lib/utils";

function VacancyCatalogActivePresetNameRow({
  serverName,
  deletePending,
  onCommit,
}: {
  serverName: string;
  deletePending: boolean;
  onCommit: (trimmed: string) => void;
}) {
  const [draft, setDraft] = useState(serverName);
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация с сервером после refresh / переименования пресета
    setDraft(serverName);
  }, [serverName]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="vacancy-preset-name-display" className="text-sm font-medium">
        Название фильтра
      </Label>
      <Input
        id="vacancy-preset-name-display"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={80}
        disabled={deletePending}
        onBlur={(e) => {
          const trimmed = e.currentTarget.value.trim();
          if (trimmed === "") {
            toast.error("Введи название фильтра");
            setDraft(serverName);
            return;
          }
          if (trimmed === serverName) return;
          onCommit(trimmed);
        }}
        className="bg-card border-border h-9 shadow-sm"
      />
    </div>
  );
}

function duplicateVacancyPresetDisplayName(sourceName: string): string {
  const base = sourceName.trim() || "Фильтр";
  const suffix = " (копия)";
  const max = 80;
  if (base.length + suffix.length <= max) return `${base}${suffix}`;
  const headLen = max - suffix.length;
  return `${base.slice(0, Math.max(0, headLen))}${suffix}`;
}

const SPECIALTY_SELECT_ANY = "__any__";
const SPECIALTY_SELECT_MULTI = "__multi__";
const SPECIALTIES: { value: (typeof VACANCY_LIST_SPECIALTY_VALUES)[number]; label: string }[] = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "FULLSTACK", label: "Fullstack" },
  { value: "IOS_MOBILE", label: "iOS" },
  { value: "ANDROID_MOBILE", label: "Android" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "QA", label: "QA" },
  { value: "DATA", label: "Data" },
  { value: "ML_AI", label: "ML / AI" },
  { value: "SECURITY", label: "Security" },
];

const GRADES: { value: (typeof VACANCY_LIST_GRADE_VALUES)[number]; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
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

  const [salaryFrom, setSalaryFrom] = useState(() =>
    committedSalary != null && committedSalary !== ""
      ? sanitizeMoneyIntegerDigits(committedSalary)
      : "",
  );
  const [salaryCurrencySelect, setSalaryCurrencySelect] =
    useState<VacancySalaryCurrency>(selectValueFromCommitted);

  function commit(nextSalary: string | undefined, currency: VacancySalaryCurrency) {
    const digitsRaw = nextSalary != null ? sanitizeMoneyIntegerDigits(nextSalary) : "";
    const digits = clampMoneyIntegerDigits(digitsRaw, VACANCY_SALARY_AMOUNT_MAX);
    const hasSalary = Boolean(digits);
    if (!hasSalary) {
      apply({ salaryFrom: undefined, salaryCurrency: undefined });
      return;
    }
    apply({ salaryFrom: digits, salaryCurrency: currency });
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="salary-from" className="text-sm font-medium">
        Зарплата не ниже
      </Label>
      <InputGroup className="border-border bg-card h-9 w-full min-w-0 rounded-lg shadow-sm">
        <InputGroupInput
          id="salary-from"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formatRuMoneyIntegerDisplay(salaryFrom)}
          onChange={(e) =>
            setSalaryFrom(
              clampMoneyIntegerDigits(
                sanitizeMoneyIntegerDigits(e.target.value),
                VACANCY_SALARY_AMOUNT_MAX,
              ),
            )
          }
          onBlur={() => commit(salaryFrom || undefined, salaryCurrencySelect)}
          placeholder="Минимум"
          className="h-9 min-h-9 min-w-0 text-base tabular-nums md:text-sm"
        />
        <InputGroupAddon align="inline-end" className="shrink-0 pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton
                variant="ghost"
                type="button"
                aria-label="Валюта зарплаты"
                className="h-9 min-h-9 w-fit max-w-full min-w-0 shrink-0 gap-1.5 rounded-lg px-2 font-medium tabular-nums"
              >
                <SalaryCurrencyIcon code={salaryCurrencySelect} className="size-3.5" />
                <span className="min-w-0">{salaryCurrencySelect}</span>
                <ChevronDown className="text-muted-foreground size-3.5 shrink-0 opacity-80" />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={salaryCurrencySelect}
                onValueChange={(v) => {
                  const c = v as VacancySalaryCurrency;
                  setSalaryCurrencySelect(c);
                  commit(salaryFrom || undefined, c);
                }}
              >
                {VACANCY_SALARY_CURRENCY_VALUES.map((c) => (
                  <DropdownMenuRadioItem key={c} value={c} className="gap-2">
                    <SalaryCurrencyIcon code={c} className="size-3.5" />
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      </InputGroup>
    </div>
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
  onReset: () => void;
  presets: PresetRow[];
  isLoggedIn: boolean;
  /** Совпадение текущих параметров с сохранённым пресетом (без учёта «закреплённого» выбора). */
  matchedPresetId: string | undefined;
  /** Пресет, выбранный в UI или удерживаемый после правок до совпадения снова. */
  activePresetId: string | undefined;
  /** После сброса каталога: не показывать matched preset в списке пресетов, пока пользователь снова не выберет пункт. */
  vacancyPresetSidebarCleared?: boolean;
  /** В мобильном `sheet`: нижняя панель — `SheetFooter`; скроллится только `CardContent`. */
  variant?: "default" | "sheet";
  /** После авторизации с каталога: один раз открыть диалог сохранения фильтров. */
  resumeVacancyPresetSave?: boolean;
  /** После сохранения набора в диалоге или после подтверждённого удаления пресета: например закрытие мобильного `Sheet`. */
  onApplyFilters?: () => void;
  /** После успешного создания пресета в диалоге — выбрать его в каталоге. */
  onVacancySearchPresetCreated?: (row: { id: string; params: unknown }) => void;
}

export function VacancyFilters({
  currentParams,
  onApplyPatch,
  onReset,
  presets,
  isLoggedIn,
  matchedPresetId,
  activePresetId,
  vacancyPresetSidebarCleared = false,
  variant = "default",
  resumeVacancyPresetSave = false,
  onApplyFilters,
  onVacancySearchPresetCreated,
}: Props) {
  const router = useRouter();
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetIdPendingDelete, setPresetIdPendingDelete] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [presetNameInvalid, setPresetNameInvalid] = useState(false);
  const [presetDialogSourceParams, setPresetDialogSourceParams] = useState<unknown>(null);
  const utils = trpcReact.useUtils();
  const autoOpenedSaveAfterAuth = useRef(false);
  const presetNameSaveInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!saveOpen) return;
    let cancelled = false;
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = presetNameSaveInputRef.current;
        if (!el) return;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
    };
  }, [saveOpen]);

  useEffect(() => {
    if (!resumeVacancyPresetSave || !isLoggedIn || autoOpenedSaveAfterAuth.current) return;
    autoOpenedSaveAfterAuth.current = true;
    setPresetDialogSourceParams(null);
    setPresetName("");
    setSaveOpen(true);
  }, [resumeVacancyPresetSave, isLoggedIn]);

  const createPreset = trpcReact.vacancySearchPresets.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Фильтр сохранён");
      setSaveOpen(false);
      setPresetName("");
      setPresetNameInvalid(false);
      setPresetDialogSourceParams(null);
      await utils.vacancySearchPresets.list.invalidate();
      await router.refresh();
      onVacancySearchPresetCreated?.({ id: data.id, params: data.params });
      onApplyFilters?.();
    },
    onError: (e) => toast.error(e.message || "Не удалось сохранить"),
  });

  const updatePreset = trpcReact.vacancySearchPresets.update.useMutation({
    onSuccess: async (_data, variables) => {
      if (variables.name !== undefined && variables.params === undefined) {
        toast.success("Название сохранено");
      } else if (variables.params !== undefined) {
        toast.success("Параметры фильтра сохранены");
      } else {
        toast.success("Фильтр обновлён");
      }
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
      onApplyFilters?.();
    },
    onError: (e) => toast.error(e.message || "Не удалось удалить"),
  });

  function apply(patch: Partial<VacancyListFlatSearchParams>) {
    onApplyPatch(patch);
  }

  const resolvedPresetId = vacancyPresetSidebarCleared
    ? undefined
    : (activePresetId ?? matchedPresetId);

  const resolvedPresetRow = useMemo(
    () => (resolvedPresetId ? presets.find((x) => x.id === resolvedPresetId) : undefined),
    [resolvedPresetId, presets],
  );

  const catalogPresetKey = useMemo(
    () => JSON.stringify(flatParamsForPresetSave(currentParams)),
    [currentParams],
  );

  const presetSnapshotKey = useMemo(
    () =>
      resolvedPresetRow
        ? JSON.stringify(normalizedPresetParamsRecord(resolvedPresetRow.params))
        : "",
    [resolvedPresetRow],
  );

  useEffect(() => {
    if (!resolvedPresetId || !resolvedPresetRow) return;
    if (updatePreset.isPending || deletePreset.isPending) return;
    if (isVacancyFlatMatchingPresetParams(currentParams, resolvedPresetRow.params)) return;

    const id = resolvedPresetId;
    const params = flatParamsForPresetSave(currentParams);
    const t = window.setTimeout(() => {
      updatePreset.mutate({ id, params });
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    resolvedPresetId,
    resolvedPresetRow,
    catalogPresetKey,
    presetSnapshotKey,
    currentParams,
    updatePreset.isPending,
    deletePreset.isPending,
    updatePreset,
  ]);

  const pendingDeletePresetName = useMemo(() => {
    if (!presetIdPendingDelete) return "";
    return presets.find((p) => p.id === presetIdPendingDelete)?.name ?? "";
  }, [presetIdPendingDelete, presets]);

  const hasVacancyFiltersToSave = useMemo(
    () => Object.keys(flatParamsForPresetSave(currentParams)).length > 0,
    [currentParams],
  );

  const vacancyFiltersResetDisabled = useMemo(
    () => isVacancyCatalogFlatBaseline(currentParams) && !resolvedPresetId,
    [currentParams, resolvedPresetId],
  );

  const specialtyValues = parseVacancyListSpecialtyCsvParam(currentParams.specialty) ?? [];
  const specialtySelectValue =
    specialtyValues.length === 0
      ? SPECIALTY_SELECT_ANY
      : specialtyValues.length === 1
        ? specialtyValues[0]
        : SPECIALTY_SELECT_MULTI;
  const gradeValues = parseCsvEnumParam(currentParams.grade, VACANCY_LIST_GRADE_VALUES) ?? [];
  const formatValues =
    parseCsvEnumParam(currentParams.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES) ?? [];

  const isSheet = variant === "sheet";

  function handleSaveFiltersFooterAction() {
    if (!isSheet) {
      document
        .querySelector("[data-vacancy-catalog-main]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (!isLoggedIn) {
      onApplyFilters?.();
      const returnPath = buildVacancyCatalogLoginReturnHref(currentParams);
      router.push(`/login?callbackUrl=${encodeURIComponent(returnPath)}`);
      return;
    }
    setPresetDialogSourceParams(null);
    setPresetName("");
    setSaveOpen(true);
  }

  function submitVacancyPresetSaveDialog() {
    if (createPreset.isPending) return;
    const name = presetName.trim();
    if (!name) {
      setPresetNameInvalid(true);
      return;
    }
    const params =
      presetDialogSourceParams != null
        ? flatParamsForPresetSave(
            mergeVacancyListFlat({ page: "1" }, presetParamsFromJson(presetDialogSourceParams)),
          )
        : flatParamsForPresetSave(currentParams);
    createPreset.mutate({ name, params });
  }

  const combinedFooter = (
    <div className="flex w-full min-w-0 items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            disabled={vacancyFiltersResetDisabled}
            onClick={() => {
              onReset();
              toast.success("Фильтр сброшен");
            }}
            aria-label="Сбросить фильтры"
          >
            <RotateCcw />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Сбросить фильтры</TooltipContent>
      </Tooltip>
      <div className="min-w-0 flex-1" aria-hidden />
      {resolvedPresetId ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              aria-label="Действия с сохранённым фильтром"
            >
              <MoreVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem
              disabled={createPreset.isPending || !resolvedPresetRow}
              onSelect={() => {
                if (!resolvedPresetRow) return;
                setPresetDialogSourceParams(resolvedPresetRow.params);
                setPresetName(duplicateVacancyPresetDisplayName(resolvedPresetRow.name));
                setSaveOpen(true);
              }}
            >
              <Copy className="size-4 shrink-0" aria-hidden />
              Дублировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={deletePreset.isPending}
              onSelect={() => {
                setPresetIdPendingDelete(resolvedPresetId);
                setDeleteConfirmOpen(true);
              }}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : hasVacancyFiltersToSave ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 rounded-full"
              onClick={handleSaveFiltersFooterAction}
              aria-label="Сохранить фильтр"
            >
              <Save className="size-4 shrink-0" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Сохранить фильтр</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );

  return (
    <Card
      className={cn(
        "border-border shadow-sm",
        isSheet &&
          "h-full min-h-0 flex-1 gap-0 overflow-hidden rounded-t-2xl rounded-b-none border-0 py-0 shadow-none ring-0",
      )}
    >
      {isSheet ? (
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3">
          <SheetTitle className="flex min-w-0 flex-1 items-center gap-2 text-base font-semibold">
            <IconFilter className="size-5 shrink-0" aria-hidden stroke={1.75} />
            Фильтры
          </SheetTitle>
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Закрыть"
            >
              <XIcon />
              <span className="sr-only">Закрыть</span>
            </Button>
          </SheetClose>
        </div>
      ) : (
        <CardHeader className="px-5 pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <IconFilter className="size-5 shrink-0" aria-hidden stroke={1.75} />
            Фильтры
          </CardTitle>
        </CardHeader>
      )}
      <CardContent
        className={cn(
          "flex flex-col gap-5 px-5 pb-4",
          isSheet && "min-h-0 flex-1 overflow-y-auto overscroll-contain",
        )}
      >
        {resolvedPresetRow && resolvedPresetId ? (
          <VacancyCatalogActivePresetNameRow
            key={resolvedPresetId}
            serverName={resolvedPresetRow.name}
            deletePending={deletePreset.isPending}
            onCommit={(trimmed) => updatePreset.mutate({ id: resolvedPresetId, name: trimmed })}
          />
        ) : null}

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
            <SelectTrigger className="bg-card h-9 w-full gap-1.5 rounded-lg">
              {specialtySelectValue === SPECIALTY_SELECT_ANY ? (
                <IconFilter
                  className="text-muted-foreground size-4 shrink-0"
                  aria-hidden
                  stroke={1.75}
                />
              ) : specialtySelectValue === SPECIALTY_SELECT_MULTI ? (
                <IconStack2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
              ) : (
                <SpecialtyIcon specialty={specialtySelectValue} />
              )}
              <SelectValue placeholder="Специализация" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={SPECIALTY_SELECT_ANY}>Любая</SelectItem>
              {specialtyValues.length > 1 ? (
                <SelectItem value={SPECIALTY_SELECT_MULTI}>Несколько выбрано</SelectItem>
              ) : null}
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.value} value={s.value} textValue={s.label}>
                  <span className="flex items-center gap-2">
                    <SpecialtyIcon specialty={s.value} />
                    {s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <GradeIcon className="size-4" />
            Грейд
          </Label>
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
              <ToggleGroupItem
                key={f.value}
                value={f.value}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <WorkFormatIcon format={f.value} className="size-3.5 opacity-90" />
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
      {isSheet ? (
        <SheetFooter className="bg-card border-border mt-auto flex w-full shrink-0 flex-col gap-3 border-t px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:flex-col sm:justify-start">
          {combinedFooter}
        </SheetFooter>
      ) : (
        <CardFooter className="border-border bg-card flex flex-col gap-3 border-t px-5 py-4">
          {combinedFooter}
        </CardFooter>
      )}

      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setPresetIdPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton actionHotkeys>
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setPresetIdPendingDelete(null);
              }}
            >
              Отмена
              <DialogHotkeyKbd className="ml-1">Esc</DialogHotkeyKbd>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!presetIdPendingDelete || deletePreset.isPending}
              data-dialog-hotkey="confirm"
              onClick={() => {
                if (!presetIdPendingDelete) return;
                deletePreset.mutate({ id: presetIdPendingDelete });
              }}
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              Удалить
              <DialogHotkeyKbd className="ml-1">⏎</DialogHotkeyKbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={saveOpen}
        onOpenChange={(open) => {
          setSaveOpen(open);
          setPresetNameInvalid(false);
          if (!open) setPresetDialogSourceParams(null);
        }}
      >
        <DialogContent actionHotkeys>
          <DialogHeader>
            <DialogTitle>Сохранить фильтр</DialogTitle>
          </DialogHeader>
          <form
            className="contents"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submitVacancyPresetSaveDialog();
            }}
          >
            <FieldGroup>
              <Field data-invalid={presetNameInvalid ? true : undefined}>
                <FieldLabel htmlFor="preset-name">Введи название</FieldLabel>
                <Input
                  ref={presetNameSaveInputRef}
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => {
                    setPresetName(e.target.value);
                    setPresetNameInvalid(false);
                  }}
                  maxLength={80}
                  placeholder="Удалённый бэкенд"
                  className="h-9"
                  aria-invalid={presetNameInvalid}
                  aria-describedby={presetNameInvalid ? "preset-name-desc" : undefined}
                />
                {presetNameInvalid ? (
                  <FieldDescription id="preset-name-desc" className="text-destructive">
                    Укажи непустое название
                  </FieldDescription>
                ) : null}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                Отмена
                <DialogHotkeyKbd className="ml-1">Esc</DialogHotkeyKbd>
              </Button>
              <Button type="submit" disabled={createPreset.isPending} data-dialog-hotkey="confirm">
                Сохранить
                <DialogHotkeyKbd className="ml-1">⏎</DialogHotkeyKbd>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
