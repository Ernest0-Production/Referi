import { VacancyListing, type VacancyListSearchParams } from "./vacancies/VacancyListing";

interface PageProps {
  searchParams: Promise<VacancyListSearchParams>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <VacancyListing params={params} />;
}
