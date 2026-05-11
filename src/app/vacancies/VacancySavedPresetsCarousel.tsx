"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <p className="text-sm font-medium" id="vacancy-saved-presets-heading">
        Сохранённые фильтры
      </p>
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
            {presets.map((pr) => (
              <ToggleGroupItem
                key={pr.id}
                value={pr.id}
                title={pr.name}
                className="max-w-[min(100%,14rem)] min-w-0 shrink font-medium"
                onClick={() => {
                  if (value === pr.id) {
                    onValueChange(VACANCY_SAVED_PRESET_CLEAR_VALUE);
                  }
                }}
              >
                <span className="min-w-0 truncate">{pr.name}</span>
              </ToggleGroupItem>
            ))}
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
