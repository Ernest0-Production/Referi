"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

/** Внутреннее значение снятия выбора пресета в карусели (повторный клик по активному чипу). */
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
  const selectionExpanded = value !== VACANCY_SAVED_PRESET_CLEAR_VALUE;
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!carouselApi || !selectionExpanded) return;
    const idx = presets.findIndex((p) => p.id === value);
    if (idx >= 0) carouselApi.scrollTo(idx);
  }, [carouselApi, selectionExpanded, value, presets]);

  useEffect(() => {
    if (!carouselApi || !selectionExpanded) return;

    const applyVisiblePreset = () => {
      const snapIndex = carouselApi.selectedScrollSnap();
      const row = presets[snapIndex];
      if (!row || row.id === value) return;
      onValueChange(row.id);
    };

    carouselApi.on("select", applyVisiblePreset);
    return () => {
      carouselApi.off("select", applyVisiblePreset);
    };
  }, [carouselApi, selectionExpanded, presets, value, onValueChange]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {presets.length === 0 ? (
        <p className="text-muted-foreground text-sm">Пока нет сохранённых наборов.</p>
      ) : (
        <Carousel
          key={selectionExpanded ? "preset-selected-full" : "preset-browse-pairs"}
          opts={{
            align: "start",
            dragFree: false,
            slidesToScroll: selectionExpanded ? 1 : 2,
            containScroll: "trimSnaps",
          }}
          setApi={setCarouselApi}
          className="relative w-full min-w-0 pt-1 pr-9 pb-1 pl-9"
        >
          <CarouselPrevious
            type="button"
            variant="outline"
            className="border-border bg-card text-foreground hover:bg-muted top-1/2 left-0 z-10 -translate-y-1/2 shadow-sm"
          />
          <CarouselContent className="-ml-2">
            {presets.map((pr) => (
              <CarouselItem
                key={pr.id}
                className={cn("flex min-w-0 pl-2", selectionExpanded ? "basis-full" : "basis-1/2")}
              >
                <PresetChip
                  pressed={value === pr.id}
                  label={pr.name}
                  title={pr.name}
                  onClick={() =>
                    onValueChange(value === pr.id ? VACANCY_SAVED_PRESET_CLEAR_VALUE : pr.id)
                  }
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNext
            type="button"
            variant="outline"
            className="border-border bg-card text-foreground hover:bg-muted top-1/2 right-0 z-10 -translate-y-1/2 shadow-sm"
          />
          <span className="sr-only" aria-live="polite">
            {value === VACANCY_SAVED_PRESET_CLEAR_VALUE
              ? "Сохранённый набор не выбран"
              : `Выбран набор «${presets.find((p) => p.id === value)?.name ?? ""}»`}
          </span>
        </Carousel>
      )}
    </div>
  );
}

function PresetChip({
  label,
  title,
  pressed,
  onClick,
}: {
  label: string;
  title?: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex h-8 max-h-8 w-full min-w-0 items-center justify-center rounded-md border px-2 py-0 text-sm font-medium shadow-none transition-colors",
        pressed
          ? "border-border bg-background text-foreground dark:border-input dark:bg-input/30 shadow-sm"
          : "text-foreground/60 hover:text-foreground hover:bg-muted/60 dark:text-muted-foreground border-transparent",
      )}
    >
      <span className="min-w-0 truncate text-center">{label}</span>
    </button>
  );
}
