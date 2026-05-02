"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { mergeVacancyListQueryParams, type VacancyListFlatSearchParams } from "@/lib/vacancyListQuery";

export function VacancyListChrome({
  currentParams,
  listPath,
  total,
}: {
  currentParams: VacancyListFlatSearchParams;
  listPath: string;
  total: number;
}) {
  const router = useRouter();
  const [queryDraft, setQueryDraft] = useState(currentParams.query ?? "");
  const [isPending, startTransition] = useTransition();

  function pushMerged(patch: Partial<VacancyListFlatSearchParams>) {
    const q = mergeVacancyListQueryParams(currentParams, patch);
    const qs = q.toString();
    router.push(`${listPath}${qs ? `?${qs}` : ""}`);
  }

  function runSearch() {
    startTransition(() => {
      pushMerged({ query: queryDraft.trim() || undefined });
    });
  }

  const hideViewedOn = currentParams.hideViewed === "1";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Ваша следующая роль — с рефералом
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
          Вакансии от разработчиков внутри компаний: прозрачный процесс и защищённое вознаграждение рефереру.
        </p>
      </header>

      <InputGroup className="h-11 w-full min-w-0 rounded-xl border-border bg-card shadow-sm md:h-12">
        <InputGroupInput
          placeholder="Название вакансии или компании"
          value={queryDraft}
          onChange={(e) => setQueryDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          className="h-full min-h-10 text-base md:text-sm"
        />
        <InputGroupAddon>
          {isPending ? <Spinner /> : <Search />}
        </InputGroupAddon>
        <InputGroupAddon align="inline-end" className="gap-2 pr-2">
          <InputGroupText className="hidden shrink-0 whitespace-nowrap sm:inline-flex">
            Найдено: {total}
          </InputGroupText>
          <InputGroupButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={isPending}
            onClick={runSearch}
          >
            Искать
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={currentParams.sort ?? "created_desc"}
            onValueChange={(v) => pushMerged({ sort: v || undefined })}
          >
            <SelectTrigger className="h-9 w-[200px] rounded-lg border-border bg-card">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} align="start">
              <SelectItem value="created_desc">Сначала новые</SelectItem>
              <SelectItem value="salary_desc">По зарплате</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-viewed"
              checked={hideViewedOn}
              onCheckedChange={(c) => pushMerged({ hideViewed: c === true ? "1" : undefined })}
            />
            <Label htmlFor="hide-viewed" className="cursor-pointer text-sm font-normal text-muted-foreground">
              Скрыть просмотренные
            </Label>
          </div>
        </div>

        <p className="text-sm text-muted-foreground sm:hidden">Найдено: {total}</p>
      </div>
    </div>
  );
}
