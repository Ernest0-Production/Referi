"use client";

import { IconBookmarksFilled, IconCircleDotFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
  onReset,
  showReset,
}: {
  presets: VacancySavedPresetRow[];
  value: string;
  onValueChange: (next: string) => void;
  onReset: () => void;
  showReset: boolean;
}) {
  const toggleValue = value === VACANCY_SAVED_PRESET_CLEAR_VALUE ? "" : value;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2">
        <h2
          id="vacancy-saved-presets-heading"
          className="text-foreground flex min-w-0 flex-1 items-center gap-2 text-lg font-semibold"
        >
          <IconBookmarksFilled className="text-muted-foreground size-5 shrink-0" aria-hidden />
          <span className="min-w-0">Сохранённые фильтры</span>
        </h2>
        {showReset ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex shrink-0 self-center">
                <Button type="button" variant="link" size="sm" onClick={onReset}>
                  Сбросить
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={4}>
              Сбросить фильтры
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {presets.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет сохранённых наборов.</p>
      ) : (
        <>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={2}
            value={toggleValue}
            onValueChange={(next) => {
              if (next) onValueChange(next);
            }}
            aria-labelledby="vacancy-saved-presets-heading"
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
        </>
      )}
    </div>
  );
}
