"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  const utils = trpcReact.useUtils();

  const createPreset = trpcReact.vacancySearchPresets.create.useMutation({
    onSuccess: async () => {
      toast.success("Фильтр сохранён");
      setSaveOpen(false);
      setPresetName("");
      await utils.vacancySearchPresets.list.invalidate();
      router.refresh();
    },
    onError: (e) => toast.error(e.message || "Не удалось сохранить"),
  });

  function apply(patch: Partial<VacancyListFlatSearchParams>) {
    const q = mergeVacancyListQueryParams(currentParams, patch);
    const qs = q.toString();
    router.push(`${listPath}${qs ? `?${qs}` : ""}`);
  }

  function applyPresetSelection(presetId: string) {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    const patch = presetParamsFromJson(p.params);
    const q = vacancyListFlatToSearchParams({ ...patch, page: "1" });
    const qs = q.toString();
    router.push(`${listPath}${qs ? `?${qs}` : ""}`);
  }

  const specialtyValues = parseCsvEnumParam(currentParams.specialty, VACANCY_LIST_SPECIALTY_VALUES) ?? [];
  const gradeValues = parseCsvEnumParam(currentParams.grade, VACANCY_LIST_GRADE_VALUES) ?? [];
  const formatValues = parseCsvEnumParam(currentParams.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES) ?? [];

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Фильтры</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium text-foreground">Ваши фильтры</Label>
            {presets.length > 0 ? (
              <span className="text-xs text-muted-foreground">{presets.length} сохранённых</span>
            ) : null}
          </div>
          {!isLoggedIn ? (
            <Alert>
              <AlertDescription className="text-sm">
                <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                  Войдите
                </Link>
                , чтобы сохранять наборы фильтров.
              </AlertDescription>
            </Alert>
          ) : (
            <Select disabled={presets.length === 0} onValueChange={applyPresetSelection}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-card">
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
          <ScrollArea className="max-h-40 pr-2">
            <ToggleGroup
              type="multiple"
              spacing={2}
              value={specialtyValues}
              onValueChange={(next) => {
                apply({ specialty: next.length ? serializeCsvParam(next) : undefined });
              }}
              className="flex flex-wrap justify-start"
            >
              {SPECIALTIES.map((s) => (
                <ToggleGroupItem
                  key={s.value}
                  value={s.value}
                  variant="outline"
                  size="sm"
                >
                  {s.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ScrollArea>
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
              <ToggleGroupItem
                key={g.value}
                value={g.value}
                variant="outline"
                size="sm"
              >
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
              >
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
      <CardFooter className="flex flex-col gap-3 border-t border-border px-4 py-4">
        <div className="flex w-full items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => router.push(listPath)}
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

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сохранить фильтры</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="preset-name">Название</FieldLabel>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                maxLength={80}
                placeholder="Например: Удалённый бэкенд"
                className="h-9"
              />
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
                  toast.error("Введите название");
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
