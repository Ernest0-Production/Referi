"use client";

import { IconClockHour4, IconCoins } from "@tabler/icons-react";
import { Search } from "lucide-react";
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
import { type VacancyListFlatSearchParams } from "@/lib/vacancyListQuery";

export function VacancyListChrome({
  currentParams,
  onApplyPatch,
  total,
  listBusy,
}: {
  currentParams: VacancyListFlatSearchParams;
  onApplyPatch: (patch: Partial<VacancyListFlatSearchParams>) => void;
  total: number;
  listBusy: boolean;
}) {
  const [queryDraft, setQueryDraft] = useState(currentParams.query ?? "");
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    startTransition(() => {
      onApplyPatch({ query: queryDraft.trim() || undefined });
    });
  }

  const hideViewedOn = currentParams.hideViewed === "1";

  const sortValue = currentParams.sort ?? "created_desc";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-foreground text-3xl font-bold tracking-tight md:text-4xl">
          Ваша следующая роль — с рефералом
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
          Рефералки от разработчиков внутри компаний: прозрачный процесс и защищённое вознаграждение
          рефереру.
        </p>
      </header>

      <InputGroup
        aria-busy={listBusy || isPending}
        className="border-border bg-card h-11 w-full min-w-0 rounded-xl shadow-sm md:h-12"
      >
        <InputGroupInput
          placeholder="Название рефералки или компании"
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
        <InputGroupAddon>{isPending ? <Spinner /> : <Search />}</InputGroupAddon>
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
          <Select value={sortValue} onValueChange={(v) => onApplyPatch({ sort: v || undefined })}>
            <SelectTrigger className="border-border bg-card h-9 w-[min(100%,220px)] rounded-lg">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} align="start">
              <SelectItem value="created_desc" textValue="Сначала новые">
                <span className="flex items-center gap-2">
                  <IconClockHour4
                    className="text-muted-foreground size-4 shrink-0"
                    stroke={1.75}
                    aria-hidden
                  />
                  Сначала новые
                </span>
              </SelectItem>
              <SelectItem value="salary_desc" textValue="По зарплате">
                <span className="flex items-center gap-2">
                  <IconCoins
                    className="text-muted-foreground size-4 shrink-0"
                    stroke={1.75}
                    aria-hidden
                  />
                  По зарплате
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-viewed"
              checked={hideViewedOn}
              onCheckedChange={(c) => onApplyPatch({ hideViewed: c === true ? "1" : undefined })}
            />
            <Label
              htmlFor="hide-viewed"
              className="text-muted-foreground cursor-pointer text-sm font-normal"
            >
              Скрыть просмотренные
            </Label>
          </div>
        </div>

        <p className="text-muted-foreground text-sm sm:hidden">Найдено: {total}</p>
      </div>
    </div>
  );
}
