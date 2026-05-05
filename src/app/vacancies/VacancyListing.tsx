import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/root";
import {
  normalizeVacancyListSearchParams,
  type VacancyListSearchParamsInput,
} from "@/lib/vacancyListQuery";
import { readVacancyViewedIdsFromCookies } from "@/lib/vacancyViewedCookie";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { VacancyCatalogClient } from "./VacancyCatalogClient";
import { vacancyFlatToTrpcListInput } from "./vacancyFlatToTrpcListInput";

export type VacancyListSearchParams = VacancyListSearchParamsInput;

export async function VacancyListing({ params }: { params: VacancyListSearchParams }) {
  const flat = normalizeVacancyListSearchParams(params);
  const session = await auth();
  const cookieStore = await cookies();
  const viewedVacancyIds = readVacancyViewedIdsFromCookies(cookieStore);

  const listInput = vacancyFlatToTrpcListInput(flat, viewedVacancyIds);
  const initialList = await trpc.vacancies.list(listInput);

  const initialActiveVacancyIds = session?.user?.id
    ? await trpc.applications.activeVacancyIds()
    : [];

  let employerVacancyPreview: inferRouterOutputs<AppRouter>["vacancies"]["myActive"] = null;
  if (session?.user?.id) {
    employerVacancyPreview = await trpc.vacancies.myActive();
  }

  let presets: { id: string; name: string; params: unknown }[] = [];
  if (session?.user?.id) {
    presets = await trpc.vacancySearchPresets.list();
  }

  return (
    <main className="min-h-screen bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={session} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          <VacancyCatalogClient
            initialParams={flat}
            initialList={initialList}
            viewedVacancyIds={viewedVacancyIds}
            presets={presets}
            isLoggedIn={Boolean(session?.user)}
            initialActiveVacancyIds={initialActiveVacancyIds}
            employerVacancyPreview={employerVacancyPreview}
          />
        </div>
      </div>
    </main>
  );
}
