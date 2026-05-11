import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TRPCError } from "@trpc/server";
import { auth } from "@/lib/auth";
import { firstQueryParam } from "@/lib/searchParams";
import { trpc } from "@/trpc/server";
import { SubmitApplicationForm } from "./SubmitApplicationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{
    vacancyId?: string | string[];
    paidTokenId?: string | string[];
  }>;
}

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = await searchParams;
  const vacancyId = firstQueryParam(raw.vacancyId);
  const paidTokenId = firstQueryParam(raw.paidTokenId);
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
    redirect("/dashboard/vacancy");
  }

  const vacancy = { ...v, me };

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">Попросить рефералку</h1>
            <p className="text-muted-foreground text-sm">
              {vacancy.title} · {vacancy.companyName}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vacancies/${vacancyId}`}>← Назад к рефералке</Link>
          </Button>
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
