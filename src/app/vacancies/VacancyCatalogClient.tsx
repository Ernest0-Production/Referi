"use client";

import { keepPreviousData } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AppRouter } from "@/server/trpc/root";
import {
  findMatchingVacancySearchPresetId,
  mergeVacancyListFlat,
  type VacancyListFlatSearchParams,
} from "@/lib/vacancyListQuery";
import { trpcReact } from "@/trpc/client";
import { VacancyCard } from "@/components/VacancyCard";
import { Button } from "@/components/ui/button";
import { VacancyFilters } from "./VacancyFilters";
import { VacancyListChrome } from "./VacancyListChrome";
import { vacancyFlatToTrpcListInput, vacancyListInputStableKey } from "./vacancyFlatToTrpcListInput";

type ListOut = inferRouterOutputs<AppRouter>["vacancies"]["list"];

type PresetRow = { id: string; name: string; params: unknown };

export function VacancyCatalogClient({
  initialParams,
  initialList,
  viewedVacancyIds,
  presets,
  isLoggedIn,
  initialActiveVacancyIds,
}: {
  initialParams: VacancyListFlatSearchParams;
  initialList: ListOut;
  viewedVacancyIds: string[];
  presets: PresetRow[];
  isLoggedIn: boolean;
  initialActiveVacancyIds: string[];
}) {
  const [params, setParams] = useState<VacancyListFlatSearchParams>(initialParams);
  const [activeVacancyPresetId, setActiveVacancyPresetId] = useState<string | undefined>(undefined);
  const [vacancyPresetSidebarCleared, setVacancyPresetSidebarCleared] = useState(false);
  const [savedPresetSelectLayoutKey, setSavedPresetSelectLayoutKey] = useState(0);
  const lastMatchedVacancyPresetIdRef = useRef<string | undefined>(undefined);

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
    if (
      activeVacancyPresetId != null &&
      !presets.some((p) => p.id === activeVacancyPresetId)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация при исчезновении пресета из списка после refresh
      setActiveVacancyPresetId(undefined);
      lastMatchedVacancyPresetIdRef.current = undefined;
    }
  }, [presets, activeVacancyPresetId]);

  const initialListInput = useMemo(
    () => vacancyFlatToTrpcListInput(initialParams, viewedVacancyIds),
    [initialParams, viewedVacancyIds],
  );
  const initialStableKey = useMemo(
    () => vacancyListInputStableKey(initialListInput),
    [initialListInput],
  );

  const listInput = useMemo(
    () => vacancyFlatToTrpcListInput(params, viewedVacancyIds),
    [params, viewedVacancyIds],
  );

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

  const data = listQuery.data;
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const page = listInput.page ?? 1;
  const items = data?.items ?? [];
  const listBusy = listQuery.isFetching && !listQuery.isPending;

  return (
    <>
      <aside className="w-full shrink-0 md:sticky md:top-20 md:w-80 md:self-start">
        <VacancyFilters
          currentParams={params}
          onApplyPatch={applyPatch}
          onReplaceFromPreset={replaceFromPreset}
          onReset={resetCatalog}
          presets={presets}
          isLoggedIn={isLoggedIn}
          matchedPresetId={matchedVacancyPresetId}
          activePresetId={activeVacancyPresetId}
          onPickSavedVacancyPreset={handlePickSavedVacancyPreset}
          vacancyPresetSidebarCleared={vacancyPresetSidebarCleared}
          savedPresetSelectLayoutKey={savedPresetSelectLayoutKey}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <VacancyListChrome
          key={params.query?.trim() ? params.query.trim() : "__q_empty__"}
          currentParams={params}
          onApplyPatch={applyPatch}
          total={total}
          listBusy={listBusy}
        />

        {items.length === 0 ? (
          <div className="border-border bg-card rounded-2xl border p-8 text-center">
            <p className="text-muted-foreground">Вакансии не найдены</p>
            <p className="text-muted-foreground mt-1 text-sm">Попробуйте изменить фильтры</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((vacancy) => (
              <VacancyCard
                key={vacancy.id}
                vacancy={vacancy}
                hasActiveSeekerApplication={activeSeekerVacancyIds.has(vacancy.id)}
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
