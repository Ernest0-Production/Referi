import { redirect, notFound } from "next/navigation";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { SubmitApplicationForm } from "./SubmitApplicationForm";

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
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <ServiceBrandLink />
        <a href={`/vacancies/${vacancyId}`} className="text-sm text-gray-500 hover:text-blue-600">
          ← Назад к вакансии
        </a>
      </nav>

      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отклик на вакансию</h1>
          <p className="mt-1 text-gray-500">
            {vacancy.title} · {vacancy.companyName}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <SubmitApplicationForm
            vacancyId={vacancyId}
            paidTokenId={paidTokenId}
            defaultContactInfo={vacancy.me.contactInfo ?? ""}
            defaultBio={vacancy.me.bio ?? ""}
          />
        </div>
      </div>
    </main>
  );
}
