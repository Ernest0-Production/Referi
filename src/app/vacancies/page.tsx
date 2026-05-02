import { redirect } from "next/navigation";
import type { VacancyListSearchParams } from "./VacancyListing";

interface PageProps {
  searchParams: Promise<VacancyListSearchParams>;
}

export default async function VacanciesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      q.set(key, value);
    }
  }
  const qs = q.toString();
  redirect(qs ? `/?${qs}` : "/");
}
