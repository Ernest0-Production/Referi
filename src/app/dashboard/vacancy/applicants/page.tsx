import { redirect } from "next/navigation";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Подана",
  AWAITING_PAYMENT: "Ожидает оплаты",
  AWAITING_RESUME_HANDOFF: "Ожидает резюме",
  SEEKER_CANCEL_REQUESTED: "Запрос на отмену",
  AWAITING_COMPANY_DECISION: "На рассмотрении",
  OFFER_ACCEPTED: "Оффер принят",
  REJECTED_BY_REFERRER: "Отклонена",
  REJECTED_BY_COMPANY: "Отказ компании",
  CANCELLED: "Отменена",
  DISPUTED: "Спор",
  REFUNDED_BY_CANCEL_ACK: "Возврат (отмена)",
  REFUNDED_BY_SLA: "Возврат (SLA)",
  REFUNDED_BY_VACANCY_DELETED: "Возврат (вакансия удалена)",
};

export default async function ApplicantsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const vacancy = await trpc.vacancies.myActive();
  if (!vacancy) redirect("/dashboard/vacancy");

  const applicants = await trpc.vacancies.applicants({ vacancyId: vacancy.id });

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <ServiceBrandLink />
        <a href="/dashboard/vacancy" className="text-sm text-gray-500 hover:text-blue-600">
          ← Моя вакансия
        </a>
      </nav>

      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Кандидаты</h1>
          <p className="mt-1 text-sm text-gray-500">
            {vacancy.title} · {applicants.length} откликов
          </p>
        </div>

        {applicants.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <p className="text-gray-500">Откликов пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applicants.map((app) => (
              <div
                key={app.id}
                className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {app.seeker?.displayName ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>

                {app.bio && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">О себе</p>
                    <p className="mt-0.5 line-clamp-3 text-sm text-gray-700">{app.bio}</p>
                  </div>
                )}

                {app.contactInfo && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Контакты</p>
                    <p className="mt-0.5 text-sm text-gray-700">{app.contactInfo}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <a
                    href={`/dashboard/applications/${app.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Подробнее
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
