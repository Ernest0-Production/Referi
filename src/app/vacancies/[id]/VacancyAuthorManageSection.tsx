import { VacancyApplicantsSection } from "@/app/vacancies/[id]/VacancyApplicantsSection";

export async function VacancyAuthorManageSection({
  vacancyId,
  referrerActions = true,
}: {
  vacancyId: string;
  referrerActions?: boolean;
}) {
  return <VacancyApplicantsSection vacancyId={vacancyId} referrerActions={referrerActions} />;
}
