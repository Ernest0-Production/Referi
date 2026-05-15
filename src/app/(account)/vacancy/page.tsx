import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { firstQueryParam } from "@/lib/searchParams";
import { trpc } from "@/trpc/server";
import { dashboardVacancyEditTrail, dashboardVacancyTrail } from "@/lib/navBreadcrumbTrail";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { DashboardVacancyNav } from "./DashboardVacancyNav";
import { DashboardVacancyPageShell } from "./DashboardVacancyPageShell";
import { EditVacancyCard } from "./EditVacancyCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";
import { VACANCY_EDIT_PRIMARY_LABEL } from "@/components/vacancies/VacancyEditPrimaryButton";

type PageProps = {
  searchParams: Promise<{ edit?: string; fromVacancy?: string | string[] }>;
};

export default async function DashboardVacancyPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const { edit } = sp;
  const editMode = edit === "1" || edit === "true";
  const fromVacancyParam = firstQueryParam(sp.fromVacancy);

  const me = await trpc.auth.me();
  const vacancy = await trpc.vacancies.myActive();
  const isStaffAdmin = session.user.staffRoles.includes("ADMIN");

  let adminEditVacancy: Awaited<ReturnType<typeof trpc.vacancies.adminVacancyForEdit>> | null =
    null;
  if (editMode && fromVacancyParam && isStaffAdmin) {
    try {
      adminEditVacancy = await trpc.vacancies.adminVacancyForEdit({ id: fromVacancyParam });
    } catch {
      adminEditVacancy = null;
    }
  }

  const showOwnerEdit = Boolean(
    vacancy && editMode && (!fromVacancyParam || fromVacancyParam === vacancy.id),
  );

  const showAdminStrangerEdit = Boolean(
    isStaffAdmin &&
    editMode &&
    fromVacancyParam &&
    adminEditVacancy &&
    adminEditVacancy.id === fromVacancyParam &&
    (!vacancy || vacancy.id !== fromVacancyParam),
  );

  const showAdminEditError = Boolean(
    isStaffAdmin && editMode && fromVacancyParam && !adminEditVacancy && !showOwnerEdit,
  );

  const showForeignEditHint = Boolean(
    editMode && fromVacancyParam && !showOwnerEdit && !showAdminStrangerEdit && !showAdminEditError,
  );

  const openedFromPublicVacancyDetail = Boolean(
    vacancy && editMode && fromVacancyParam === vacancy.id,
  );

  const breadcrumbSegments =
    showAdminStrangerEdit && adminEditVacancy
      ? dashboardVacancyEditTrail(adminEditVacancy.id, adminEditVacancy.title, true)
      : vacancy && editMode
        ? dashboardVacancyEditTrail(vacancy.id, vacancy.title, openedFromPublicVacancyDetail)
        : dashboardVacancyTrail(vacancy ? "Моя рефералка" : "Создание рефералки");

  const editVacancyPayload = showOwnerEdit
    ? vacancy
    : showAdminStrangerEdit
      ? adminEditVacancy
      : null;

  return (
    <main className="flex-1">
      <DashboardVacancyPageShell>
        <BreadcrumbSeedPort seed={breadcrumbSegments} />
        <DashboardVacancyNav />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">
              {showAdminStrangerEdit
                ? "Редактирование рефералки"
                : vacancy
                  ? "Моя рефералка"
                  : "Создание рефералки"}
            </h1>
            {showAdminStrangerEdit && adminEditVacancy ? (
              <p className="text-muted-foreground text-sm">{adminEditVacancy.title}</p>
            ) : null}
            {showOwnerEdit ? (
              <p className="text-muted-foreground text-sm">
                Доступных попыток: {me.availableAttempts} из 3
              </p>
            ) : null}
          </div>

          {showAdminEditError || showForeignEditHint ? (
            <Alert>
              <AlertTitle>Не удалось открыть правку</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>
                  {showAdminEditError
                    ? "Рефералка не найдена, заморожена или у вас нет прав администратора."
                    : "Проверьте ссылку или откройте правку из карточки рефералки в каталоге."}
                </p>
                <Button variant="outline" className="w-fit" asChild>
                  <Link href="/">В каталог</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : editVacancyPayload && editMode ? (
            <EditVacancyCard
              vacancy={{
                id: editVacancyPayload.id,
                title: editVacancyPayload.title,
                companyName: editVacancyPayload.companyName,
                specialty: editVacancyPayload.specialty,
                grade: editVacancyPayload.grade,
                workFormat: editVacancyPayload.workFormat,
                salaryCurrency: editVacancyPayload.salaryCurrency,
                salaryFromKopecks: editVacancyPayload.salaryFromKopecks,
                salaryToKopecks: editVacancyPayload.salaryToKopecks,
                description: editVacancyPayload.description,
                rewardKopecks: editVacancyPayload.rewardKopecks,
              }}
            />
          ) : vacancy && !editMode ? (
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <p className="text-muted-foreground text-sm">
                  Управление заявками и кандидатами — на публичной странице рефералки в каталоге.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={`/vacancies/${vacancy.id}`}>Открыть рефералку</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/vacancy?edit=1&fromVacancy=${vacancy.id}`}>
                      {VACANCY_EDIT_PRIMARY_LABEL}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !vacancy ? (
            <Card>
              <CardContent className="flex flex-col gap-4">
                {me.availableAttempts > 0 ? (
                  <CreateVacancyForm />
                ) : (
                  <Alert>
                    <AlertTitle>Нет попыток</AlertTitle>
                    <AlertDescription>
                      У тебя не осталось попыток. Они восстанавливаются автоматически через 60 дней.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DashboardVacancyPageShell>
    </main>
  );
}
