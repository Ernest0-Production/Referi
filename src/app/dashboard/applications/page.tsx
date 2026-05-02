import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { ApplicationActionsPanel } from "./ApplicationActionsPanel";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Подана",
  AWAITING_PAYMENT: "Ожидает оплаты",
  AWAITING_RESUME_HANDOFF: "Передача резюме",
  SEEKER_CANCEL_REQUESTED: "Запрос отмены",
  AWAITING_COMPANY_DECISION: "На рассмотрении",
  OFFER_ACCEPTED: "Оффер принят",
  REJECTED_BY_REFERRER: "Отклонена",
  REJECTED_BY_COMPANY: "Отказ",
  CANCELLED: "Отменена",
  DISPUTED: "Спор",
  REFUNDED_BY_CANCEL_ACK: "Возврат",
  REFUNDED_BY_SLA: "Возврат (SLA)",
  REFUNDED_BY_CANCEL_AUTO: "Автовозврат",
  REFUNDED_BY_VACANCY_DELETED: "Возврат (вакансия)",
  REFUNDED_BY_MODERATOR: "Возврат (модератор)",
};

const TERMINAL = new Set([
  "OFFER_ACCEPTED",
  "REJECTED_BY_REFERRER",
  "REJECTED_BY_COMPANY",
  "CANCELLED",
  "REFUNDED_BY_SLA",
  "REFUNDED_BY_CANCEL_ACK",
  "REFUNDED_BY_CANCEL_AUTO",
  "REFUNDED_BY_VACANCY_DELETED",
  "REFUNDED_BY_MODERATOR",
]);

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const applications = await trpc.applications.myList({});

  const active = applications.filter((a) => !TERMINAL.has(a.status));
  const closed = applications.filter((a) => TERMINAL.has(a.status));

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Referi
        </Link>
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700">
          Найти вакансии
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Мои заявки</h1>

        {applications.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
            <p className="text-gray-500">У вас пока нет заявок</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Смотреть вакансии
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Активные ({active.length})
            </h2>
            {active.map((app) => (
              <div
                key={app.id}
                className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{app.vacancy.title}</p>
                    <p className="text-sm text-gray-500">{app.vacancy.companyName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>

                {app.paymentDeadline && (
                  <p className="text-xs text-amber-600">
                    Оплатить до:{" "}
                    {new Date(app.paymentDeadline).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                <div className="flex gap-2">
                  <a
                    href={`/dashboard/applications/${app.id}`}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Подробнее
                  </a>
                  <ApplicationActionsPanel applicationId={app.id} status={app.status} />
                </div>
              </div>
            ))}
          </section>
        )}

        {closed.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Завершённые ({closed.length})
            </h2>
            {closed.map((app) => (
              <div
                key={app.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 opacity-70"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-700">{app.vacancy.title}</p>
                    <p className="text-sm text-gray-400">{app.vacancy.companyName}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
