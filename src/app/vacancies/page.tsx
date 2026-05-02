import type { VacancyListSearchParams } from "./VacancyListing";
import { VacancyListing } from "./VacancyListing";

interface PageProps {
  searchParams: Promise<VacancyListSearchParams>;
}

export default async function VacanciesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <VacancyListing params={params} />;
}
