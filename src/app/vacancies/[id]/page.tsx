import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import Link from "next/link";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  MOBILE: "Mobile",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<string, string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VacancyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();

  let vacancy;
  try {
    vacancy = await trpc.vacancies.getById({ id });
  } catch {
    notFound();
  }

  const salaryFrom = vacancy.salaryFromKopecks
    ? Math.round(Number(vacancy.salaryFromKopecks) / 100)
    : null;
  const salaryTo = vacancy.salaryToKopecks
    ? Math.round(Number(vacancy.salaryToKopecks) / 100)
    : null;
  const reward = Math.round(Number(vacancy.rewardKopecks) / 100);

  const fmt = (v: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-600">
          Referi
        </Link>
        {session?.user ? (
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600">
            Дашборд
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Войти
          </Link>
        )}
      </nav>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Link href="/vacancies" className="text-sm text-gray-500 hover:text-gray-700">
          ← Все вакансии
        </Link>

        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vacancy.title}</h1>
              <p className="mt-1 text-gray-500">{vacancy.companyName}</p>
            </div>
            {reward > 0 && (
              <span className="shrink-0 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
                Бонус: {fmt(reward)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-blue-50 px-3 py-1 text-sm text-blue-700">
              {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
            </span>
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {GRADE_LABELS[vacancy.grade] ?? vacancy.grade}
            </span>
            <span className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}
            </span>
          </div>

          {(salaryFrom || salaryTo) && (
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">Зарплата</p>
              <p className="font-semibold text-gray-900">
                {salaryFrom && salaryTo
                  ? `${fmt(salaryFrom)} — ${fmt(salaryTo)}`
                  : salaryFrom
                    ? `от ${fmt(salaryFrom)}`
                    : `до ${fmt(salaryTo!)}`}
              </p>
            </div>
          )}

          <div>
            <h2 className="mb-2 font-semibold text-gray-800">Описание</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-600">
              {vacancy.description}
            </p>
          </div>

          <div className="pt-2">
            {session?.user ? (
              <Link
                href={`/dashboard/applications/new?vacancyId=${vacancy.id}`}
                className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Откликнуться
              </Link>
            ) : (
              <Link
                href={`/login?callbackUrl=/vacancies/${vacancy.id}`}
                className="inline-block rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Войти чтобы откликнуться
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
