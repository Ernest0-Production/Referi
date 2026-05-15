"use client";

import { IconCircleDotFilled, IconFilter } from "@tabler/icons-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Внутреннее значение снятия выбора пресета (повторный клик по активному пункту). */
export const VACANCY_SAVED_PRESET_CLEAR_VALUE = "__preset_clear__";

export interface VacancySavedPresetRow {
  id: string;
  name: string;
  params: unknown;
}

export function VacancySavedPresetsCarousel({
  presets,
  value,
  onValueChange,
}: {
  presets: VacancySavedPresetRow[];
  value: string;
  onValueChange: (next: string) => void;
}) {
  const toggleValue = value === VACANCY_SAVED_PRESET_CLEAR_VALUE ? "" : value;

  if (presets.length === 0) return null;

  return (
    <div className="flex w-full min-w-0 items-start gap-2 py-2 pr-2 pl-2 sm:gap-2 sm:py-2.5">
      <IconFilter
        className="text-muted-foreground mt-0.5 size-4 shrink-0"
        aria-hidden
        stroke={1.75}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-2.5">
        <span
          id="vacancy-saved-presets-label"
          className="text-muted-foreground min-w-0 text-xs font-medium sm:text-sm"
        >
          Ранее сохранённые фильтры:
        </span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          spacing={2}
          value={toggleValue}
          onValueChange={(next) => {
            if (next) onValueChange(next);
          }}
          aria-labelledby="vacancy-saved-presets-label"
          className="flex w-full min-w-0 flex-wrap justify-start"
        >
          {presets.map((pr) => {
            const selected = value === pr.id;
            return (
              <Tooltip key={pr.id}>
                <TooltipTrigger asChild>
                  <span className="inline-flex max-w-[min(100%,14rem)] min-w-0 shrink">
                    <ToggleGroupItem
                      value={pr.id}
                      title={pr.name}
                      className="max-w-full min-w-0 shrink font-medium"
                      onClick={() => {
                        if (value === pr.id) {
                          onValueChange(VACANCY_SAVED_PRESET_CLEAR_VALUE);
                        }
                      }}
                    >
                      {selected ? (
                        <IconCircleDotFilled
                          data-icon="inline-start"
                          className="size-3.5 shrink-0 opacity-90"
                          aria-hidden
                        />
                      ) : null}
                      <span className="min-w-0 truncate">{pr.name}</span>
                    </ToggleGroupItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  {selected ? "Выбранный фильтр" : "Нажми чтобы применить фильтр"}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
        <span className="sr-only" aria-live="polite">
          {value === VACANCY_SAVED_PRESET_CLEAR_VALUE
            ? "Сохранённый набор не выбран"
            : `Выбран набор «${presets.find((p) => p.id === value)?.name ?? ""}»`}
        </span>
      </div>
    </div>
  );
}
