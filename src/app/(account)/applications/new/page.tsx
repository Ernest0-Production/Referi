import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { firstQueryParam } from "@/lib/searchParams";
import { trpc } from "@/trpc/server";
import { dashboardApplicationNewTrail } from "@/lib/navBreadcrumbTrail";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";
import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { SubmitApplicationForm } from "./SubmitApplicationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{
    vacancyId?: string | string[];
    paidTokenId?: string | string[];
    fromVacancy?: string | string[];
  }>;
}

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = await searchParams;
  const vacancyId = firstQueryParam(raw.vacancyId);
  const paidTokenId = firstQueryParam(raw.paidTokenId);
  const fromVacancyParam = firstQueryParam(raw.fromVacancy);
  if (!vacancyId) notFound();

  let me;
  try {
    me = await trpc.auth.me();
  } catch (e) {
    if (e instanceof TRPCError && (e.code === "UNAUTHORIZED" || e.code === "NOT_FOUND")) {
      redirect("/login");
    }
    throw e;
  }

  let v;
  try {
    v = await trpc.vacancies.getById({ id: vacancyId });
  } catch (e) {
    if (e instanceof TRPCError && (e.code === "NOT_FOUND" || e.code === "BAD_REQUEST")) {
      notFound();
    }
    if (e instanceof TRPCError && e.code === "UNAUTHORIZED") {
      redirect("/login");
    }
    throw e;
  }

  if (v.isMine) {
    const openedFromPublicVacancyDetail = fromVacancyParam === vacancyId;
    const vacancy = { ...v, me };

    return (
      <main className="flex-1">
        <div className={PAGE_COLUMN_CLASS}>
          <BreadcrumbSeedPort
            seed={dashboardApplicationNewTrail(
              vacancyId,
              vacancy.title,
              openedFromPublicVacancyDetail,
            )}
          />
          <AppNavBreadcrumb />

          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">Попросить рефералку</h1>
            <p className="text-muted-foreground text-sm">
              {vacancy.title} · {vacancy.companyName}
            </p>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 p-6">
              <p className="text-muted-foreground text-sm">
                Это твоя рефералка — запросить её у себя нельзя.
              </p>
              <Button asChild className="w-fit">
                <Link href={`/vacancies/${vacancyId}`}>Открыть страницу рефералки</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const vacancy = { ...v, me };

  const openedFromPublicVacancyDetail = fromVacancyParam === vacancyId;

  return (
    <main className="flex-1">
      <div className={PAGE_COLUMN_CLASS}>
        <BreadcrumbSeedPort
          seed={dashboardApplicationNewTrail(
            vacancyId,
            vacancy.title,
            openedFromPublicVacancyDetail,
          )}
        />
        <AppNavBreadcrumb />

        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Попросить рефералку</h1>
          <p className="text-muted-foreground text-sm">
            {vacancy.title} · {vacancy.companyName}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <SubmitApplicationForm
              vacancyId={vacancyId}
              paidTokenId={paidTokenId}
              defaultContactInfo={vacancy.me.contactInfo ?? ""}
              defaultBio={vacancy.me.bio ?? ""}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
