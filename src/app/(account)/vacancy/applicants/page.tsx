import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";

export default async function ApplicantsPageRedirect() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const vacancy = await trpc.vacancies.myActive();
  if (!vacancy) redirect("/vacancy");
  redirect(`/vacancies/${vacancy.id}#candidates`);
}
