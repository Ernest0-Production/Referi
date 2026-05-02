import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { SubmitApplicationForm } from "./SubmitApplicationForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{ vacancyId?: string; paidTokenId?: string }>;
}

export default async function NewApplicationPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { vacancyId, paidTokenId } = await searchParams;
  if (!vacancyId) notFound();

  let vacancy;
  try {
    const [v, me] = await Promise.all([trpc.vacancies.getById({ id: vacancyId }), trpc.auth.me()]);
    vacancy = { ...v, me };
  } catch {
    notFound();
  }

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">Отклик на вакансию</h1>
            <p className="text-sm text-muted-foreground">
              {vacancy.title} · {vacancy.companyName}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/vacancies/${vacancyId}`}>← Назад к вакансии</Link>
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
