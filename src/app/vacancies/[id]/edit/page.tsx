import { hrefSignInOverlay } from "@/lib/signInOverlayParams";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import type { EditVacancyFormVacancy } from "@/app/vacancies/CreateVacancyForm";
import { VacancyEditCompose } from "./VacancyEditCompose";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ signIn?: string | string[] }>;
}

export default async function VacancyEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const signIn = Array.isArray(sp.signIn) ? sp.signIn[0] : sp.signIn;
  const session = await auth();
  if (!session?.user?.id) {
    if (signIn !== "1") {
      redirect(hrefSignInOverlay(`/vacancies/${id}/edit`));
    }
    return (
      <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
        <PublicHeaderNav session={null} />
        <main className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-sm">
          Войдите через GitHub, чтобы редактировать рефералку.
        </main>
      </div>
    );
  }

  const isStaffAdmin = session.user.staffRoles.includes("ADMIN");

  type VacancyDetail = Awaited<ReturnType<typeof trpc.vacancies.getById>>;
  let vacancy: VacancyDetail | null = null;
  try {
    vacancy = await trpc.vacancies.getById({ id });
  } catch {
    vacancy = null;
  }

  if (!vacancy && isStaffAdmin) {
    try {
      const av = await trpc.vacancies.adminVacancyForEdit({ id });
      vacancy = { ...av, isMine: false };
    } catch {
      notFound();
    }
  }

  if (!vacancy) {
    notFound();
  }

  if (!vacancy.isMine && !isStaffAdmin) {
    notFound();
  }

  const payload: EditVacancyFormVacancy = {
    id: vacancy.id,
    title: vacancy.title,
    companyName: vacancy.companyName,
    specialty: vacancy.specialty,
    grade: vacancy.grade,
    workFormat: vacancy.workFormat,
    salaryCurrency: vacancy.salaryCurrency,
    salaryFromKopecks: vacancy.salaryFromKopecks,
    salaryToKopecks: vacancy.salaryToKopecks,
    description: vacancy.description,
    rewardKopecks: vacancy.rewardKopecks,
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={session} />
      <main className="flex-1">
        <div className={PAGE_COLUMN_CLASS}>
          <VacancyEditCompose vacancy={payload} />
        </div>
      </main>
    </div>
  );
}
