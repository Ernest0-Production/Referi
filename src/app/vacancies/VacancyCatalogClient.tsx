"use client";

import { IconFilter } from "@tabler/icons-react";
import { keepPreviousData } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { ComponentProps } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppRouter } from "@/server/trpc/root";
import {
  findMatchingVacancySearchPresetId,
  mergeVacancyListFlat,
  presetParamsFromJson,
  vacancyListFlatToSearchParams,
  type VacancyListFlatSearchParams,
} from "@/lib/vacancyListQuery";
import { trpcReact } from "@/trpc/client";
import { VacancyCard } from "@/components/VacancyCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMdUp } from "@/hooks/useMdUp";
import { cn } from "@/lib/utils";
import { EmployerHomeVacancySection } from "./EmployerHomeVacancySection";
import { VacancyFilters } from "./VacancyFilters";
import { VacancyListChrome } from "./VacancyListChrome";
import {
  VacancySavedPresetsCarousel,
  VACANCY_SAVED_PRESET_CLEAR_VALUE,
} from "./VacancySavedPresetsCarousel";
import {
  vacancyFlatToTrpcListInput,
  vacancyListInputStableKey,
} from "./vacancyFlatToTrpcListInput";

type ListOut = inferRouterOutputs<AppRouter>["vacancies"]["list"];
type MyActiveOut = inferRouterOutputs<AppRouter>["vacancies"]["myActive"];

type PresetRow = { id: string; name: string; params: unknown };

type VacancyFiltersProps = ComponentProps<typeof VacancyFilters>;

function VacancyCatalogMobileFiltersPanel(props: VacancyFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto flex max-h-[min(90dvh,90vh)] max-w-md flex-col gap-0 p-0"
        >
          <VacancyFilters {...props} variant="sheet" onApplyFilters={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Button
        type="button"
        variant="default"
        size="icon"
        aria-label="Открыть фильтры"
        className={cn(
          "fixed right-5 bottom-6 z-40 h-14 w-14 rounded-full shadow-lg",
          open && "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(true)}
      >
        <IconFilter className="size-6 shrink-0" aria-hidden stroke={1.75} />
      </Button>
    </>
  );
}

export function VacancyCatalogClient({
  initialParams,
  initialList,
  viewedVacancyIds,
  presets,
  isLoggedIn,
  initialActiveVacancyIds,
  employerVacancyPreview,
  resumeVacancyPresetSave = false,
}: {
  initialParams: VacancyListFlatSearchParams;
  initialList: ListOut;
  viewedVacancyIds: string[];
  presets: PresetRow[];
  isLoggedIn: boolean;
  initialActiveVacancyIds: string[];
  employerVacancyPreview: MyActiveOut;
  resumeVacancyPresetSave?: boolean;
}) {
  const router = useRouter();
  const resumeUrlCleanupDone = useRef(false);
  const [params, setParams] = useState<VacancyListFlatSearchParams>(initialParams);
  const [activeVacancyPresetId, setActiveVacancyPresetId] = useState<string | undefined>(undefined);
  const [vacancyPresetSidebarCleared, setVacancyPresetSidebarCleared] = useState(false);
  const [savedPresetSelectLayoutKey, setSavedPresetSelectLayoutKey] = useState(0);
  const lastMatchedVacancyPresetIdRef = useRef<string | undefined>(undefined);
  const isMdUp = useMdUp();

  const matchedVacancyPresetId = useMemo(
    () => findMatchingVacancySearchPresetId(params, presets),
    [params, presets],
  );

  useLayoutEffect(() => {
    if (matchedVacancyPresetId != null) {
      lastMatchedVacancyPresetIdRef.current = matchedVacancyPresetId;
    } else if (activeVacancyPresetId == null && !vacancyPresetSidebarCleared) {
      const carry = lastMatchedVacancyPresetIdRef.current;
      if (carry != null) {
        setActiveVacancyPresetId(carry);
      }
    }
  }, [matchedVacancyPresetId, activeVacancyPresetId, vacancyPresetSidebarCleared]);

  useEffect(() => {
    if (!resumeVacancyPresetSave || !isLoggedIn || resumeUrlCleanupDone.current) return;
    resumeUrlCleanupDone.current = true;
    const q = vacancyListFlatToSearchParams(initialParams).toString();
    void router.replace(q ? `/?${q}` : "/", { scroll: false });
  }, [resumeVacancyPresetSave, isLoggedIn, initialParams, router]);

  useEffect(() => {
    if (activeVacancyPresetId != null && !presets.some((p) => p.id === activeVacancyPresetId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация при исчезновении пресета из списка после refresh
      setActiveVacancyPresetId(undefined);
      lastMatchedVacancyPresetIdRef.current = undefined;
    }
  }, [presets, activeVacancyPresetId]);

  const initialListInput = useMemo(
    () => vacancyFlatToTrpcListInput(initialParams),
    [initialParams],
  );
  const initialStableKey = useMemo(
    () => vacancyListInputStableKey(initialListInput),
    [initialListInput],
  );

  const listInput = useMemo(() => vacancyFlatToTrpcListInput(params), [params]);

  const listQuery = trpcReact.vacancies.list.useQuery(listInput, {
    placeholderData: keepPreviousData,
    initialData:
      vacancyListInputStableKey(listInput) === initialStableKey ? initialList : undefined,
  });

  const activeIdsQuery = trpcReact.applications.activeVacancyIds.useQuery(undefined, {
    enabled: isLoggedIn,
    initialData: initialActiveVacancyIds,
  });

  const activeSeekerVacancyIds = new Set(activeIdsQuery.data ?? []);
  const viewedVacancyIdSet = useMemo(() => new Set(viewedVacancyIds), [viewedVacancyIds]);

  const applyPatch = (patch: Partial<VacancyListFlatSearchParams>) => {
    setParams((c) => mergeVacancyListFlat(c, patch));
  };

  const replaceFromPreset = (next: VacancyListFlatSearchParams) => {
    setParams(next);
  };

  const resetCatalog = () => {
    setParams({});
    setActiveVacancyPresetId(undefined);
    lastMatchedVacancyPresetIdRef.current = undefined;
    setVacancyPresetSidebarCleared(true);
    setSavedPresetSelectLayoutKey((k) => k + 1);
  };

  const handlePickSavedVacancyPreset = (id: string) => {
    setVacancyPresetSidebarCleared(false);
    setActiveVacancyPresetId(id);
  };

  function handleVacancySearchPresetCreated(row: { id: string; params: unknown }) {
    setVacancyPresetSidebarCleared(false);
    setActiveVacancyPresetId(row.id);
    lastMatchedVacancyPresetIdRef.current = row.id;
    replaceFromPreset({ page: "1", ...presetParamsFromJson(row.params) });
  }

  const vacancyFilterProps = {
    currentParams: params,
    onApplyPatch: applyPatch,
    onReset: resetCatalog,
    presets,
    isLoggedIn,
    matchedPresetId: matchedVacancyPresetId,
    activePresetId: activeVacancyPresetId,
    vacancyPresetSidebarCleared,
    resumeVacancyPresetSave,
    onVacancySearchPresetCreated: handleVacancySearchPresetCreated,
  };

  const resolvedSavedPresetId = vacancyPresetSidebarCleared
    ? undefined
    : (activeVacancyPresetId ?? matchedVacancyPresetId);

  const savedPresetCarouselValue = resolvedSavedPresetId ?? VACANCY_SAVED_PRESET_CLEAR_VALUE;

  function handleSavedPresetCarouselChange(next: string) {
    if (next === VACANCY_SAVED_PRESET_CLEAR_VALUE) {
      resetCatalog();
      return;
    }
    handlePickSavedVacancyPreset(next);
    const row = presets.find((p) => p.id === next);
    if (!row) return;
    replaceFromPreset({ page: "1", ...presetParamsFromJson(row.params) });
  }

  const data = listQuery.data;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const page = listInput.page ?? 1;
  const items = data?.items ?? [];
  const listBusy = listQuery.isFetching && !listQuery.isPending;

  return (
    <>
      {isMdUp ? (
        <aside className="sticky top-20 w-80 shrink-0 self-start">
          <VacancyFilters {...vacancyFilterProps} />
        </aside>
      ) : (
        <VacancyCatalogMobileFiltersPanel {...vacancyFilterProps} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-6" data-vacancy-catalog-main>
        <EmployerHomeVacancySection
          employerVacancyPreview={employerVacancyPreview}
          isLoggedIn={isLoggedIn}
        />
        <Separator />
        {isLoggedIn ? (
          <VacancySavedPresetsCarousel
            key={`saved-preset-carousel-${savedPresetSelectLayoutKey}-${vacancyPresetSidebarCleared ? "c" : "o"}`}
            presets={presets}
            value={savedPresetCarouselValue}
            onValueChange={handleSavedPresetCarouselChange}
          />
        ) : null}
        <VacancyListChrome
          key={params.query?.trim() ? params.query.trim() : "__q_empty__"}
          currentParams={params}
          onApplyPatch={applyPatch}
          total={total}
          listBusy={listBusy}
        />

        {items.length === 0 ? (
          <div className="border-border bg-card rounded-2xl border p-8 text-center">
            <p className="text-muted-foreground">Рефералки не найдены</p>
            <p className="text-muted-foreground mt-1 text-sm">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                vacancy={vacancy}
                hasActiveSeekerApplication={activeSeekerVacancyIds.has(vacancy.id)}
                isViewed={viewedVacancyIdSet.has(vacancy.id)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {page > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="border-border bg-card text-foreground hover:bg-muted h-auto rounded-lg border px-4 py-2 text-sm font-medium"
                onClick={() => applyPatch({ page: String(page - 1) })}
              >
                Назад
              </Button>
            ) : null}
            <span className="text-muted-foreground text-sm">
              Страница {page} из {totalPages}
            </span>
            {page < totalPages ? (
              <Button
                type="button"
                variant="outline"
                className="border-border bg-card text-foreground hover:bg-muted h-auto rounded-lg border px-4 py-2 text-sm font-medium"
                onClick={() => applyPatch({ page: String(page + 1) })}
              >
                Вперёд
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
