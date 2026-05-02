import {
  normalizeVacancyListSearchParams,
  vacancyListFlatToSearchParams,
} from "@/lib/vacancyListQuery";
import { redirect } from "next/navigation";
import type { VacancyListSearchParams } from "./VacancyListing";

interface PageProps {
  searchParams: Promise<VacancyListSearchParams>;
}

export default async function VacanciesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const flat = normalizeVacancyListSearchParams(params);
  const q = vacancyListFlatToSearchParams(flat);
  const qs = q.toString();
  redirect(qs ? `/?${qs}` : "/");
}
