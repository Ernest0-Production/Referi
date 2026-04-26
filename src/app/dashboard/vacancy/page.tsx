import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { CreateVacancyForm } from "./CreateVacancyForm";
import { ManageVacancyPanel } from "./ManageVacancyPanel";

export default async function DashboardVacancyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();

  if (!me.roles.includes("REFERRER")) {
    redirect("/dashboard");
  }

  const vacancy = await trpc.vacancies.myActive();

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <a href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Referi
        </a>
        <span className="text-sm text-gray-500">{me.displayName}</span>
      </nav>

      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Моя вакансия</h1>
            <p className="mt-1 text-sm text-gray-500">
              Доступных попыток: {me.availableAttempts} из 3
            </p>
          </div>
        </div>

        {vacancy ? (
          <ManageVacancyPanel vacancy={vacancy} />
        ) : (
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="font-semibold text-gray-800">Разместить вакансию</h2>
            <p className="text-sm text-gray-500">
              У вас нет активной вакансии. Заполните форму ниже.
            </p>
            {me.availableAttempts > 0 ? (
              <CreateVacancyForm />
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Вы исчерпали все попытки. Попытки восстанавливаются автоматически через 60 дней.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
