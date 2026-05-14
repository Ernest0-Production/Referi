"use client";

import { IconClockHour4, IconCoins } from "@tabler/icons-react";
import { Search } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
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
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatVacancyCatalogCountLabel } from "@/lib/vacancyCatalogCountLabel";
import { type VacancyListFlatSearchParams } from "@/lib/vacancyListQuery";
import { cn } from "@/lib/utils";

export function VacancyListChrome({
  currentParams,
  onApplyPatch,
  total,
  listBusy,
  savedPresetsFooter,
}: {
  currentParams: VacancyListFlatSearchParams;
  onApplyPatch: (patch: Partial<VacancyListFlatSearchParams>) => void;
  total: number;
  listBusy: boolean;
  savedPresetsFooter?: ReactNode;
}) {
  const [queryDraft, setQueryDraft] = useState(currentParams.query ?? "");
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    startTransition(() => {
      onApplyPatch({ query: queryDraft.trim() || undefined });
    });
  }

  const sortValue = currentParams.sort ?? "created_desc";

  const searchInputGroup = (
    <InputGroup
      aria-busy={listBusy || isPending}
      className={cn(
        "h-11 w-full min-w-0 md:h-12",
        savedPresetsFooter
          ? "border-0 rounded-none bg-transparent shadow-none dark:bg-transparent"
          : "border-border bg-card rounded-xl shadow-sm",
      )}
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
  );

  return (
    <div className="flex flex-col gap-3">
      {savedPresetsFooter ? (
        <div className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
          {searchInputGroup}
          <div className="border-border border-t">{savedPresetsFooter}</div>
        </div>
      ) : (
        searchInputGroup
      )}

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-muted-foreground shrink-0 cursor-default text-end text-sm">
              {formatVacancyCatalogCountLabel(total)}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            Найденное количество рефералок
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
