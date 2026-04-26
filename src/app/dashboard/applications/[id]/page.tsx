import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { ApplicationDetailActions } from "./ApplicationDetailActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Подана",
  AWAITING_PAYMENT: "Ожидает оплаты",
  AWAITING_RESUME_HANDOFF: "Передача резюме",
  SEEKER_CANCEL_REQUESTED: "Запрошена отмена",
  AWAITING_COMPANY_DECISION: "На рассмотрении в компании",
  OFFER_ACCEPTED: "Оффер принят",
  REJECTED_BY_REFERRER: "Отклонена реферальщиком",
  REJECTED_BY_COMPANY: "Отказ компании",
  CANCELLED: "Отменена",
  DISPUTED: "Открыт спор",
  REFUNDED_BY_CANCEL_ACK: "Возврат (подтверждена отмена)",
  REFUNDED_BY_SLA: "Возврат (SLA)",
  REFUNDED_BY_CANCEL_AUTO: "Автоматический возврат",
  REFUNDED_BY_VACANCY_DELETED: "Возврат (вакансия удалена)",
  REFUNDED_BY_MODERATOR: "Возврат по решению модератора",
};

const ACTOR_LABELS: Record<string, string> = {
  SEEKER: "Соискатель",
  REFERRER: "Реферальщик",
  SYSTEM: "Система",
  MODERATOR: "Модератор",
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let application;
  try {
    application = await trpc.applications.getById({ applicationId: id });
  } catch {
    notFound();
  }

  const auditLog = await trpc.applications.getAuditLog({ applicationId: id });

  const isSeeker = application.content !== null;

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Referi
        </Link>
        <Link href="/dashboard/applications" className="text-sm text-gray-500 hover:text-blue-600">
          ← Мои заявки
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl space-y-6 p-8">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{application.vacancy.title}</h1>
              <p className="text-gray-500">{application.vacancy.companyName}</p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {STATUS_LABELS[application.status] ?? application.status}
            </span>
          </div>

          {/* Deadlines */}
          <div className="space-y-1 text-sm">
            {application.paymentDeadline && (
              <p className="text-amber-600">
                Оплатить до: {new Date(application.paymentDeadline).toLocaleString("ru-RU")}
              </p>
            )}
            {application.resumeHandoffDeadline && (
              <p className="text-blue-600">
                Передача резюме до:{" "}
                {new Date(application.resumeHandoffDeadline).toLocaleString("ru-RU")}
              </p>
            )}
            {application.companyDecisionDeadline && (
              <p className="text-gray-500">
                Решение компании до:{" "}
                {new Date(application.companyDecisionDeadline).toLocaleString("ru-RU")}
              </p>
            )}
          </div>

          {/* Contact info — only visible to referrer in active statuses */}
          {application.content?.contactInfo && (
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Контакты соискателя</p>
              <p className="mt-0.5 text-sm text-gray-800">{application.content.contactInfo}</p>
            </div>
          )}

          {/* My application content (visible to seeker) */}
          {isSeeker && application.content?.bio && (
            <div>
              <p className="text-xs font-medium text-gray-500">О себе</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap text-gray-700">
                {application.content.bio}
              </p>
            </div>
          )}

          <ApplicationDetailActions applicationId={id} status={application.status} />
        </div>

        {/* AuditLog */}
        {auditLog.length > 0 && (
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
            <h2 className="font-semibold text-gray-800">История изменений</h2>
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                  <div>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString("ru-RU")}
                    </span>
                    <p className="text-gray-700">
                      {ACTOR_LABELS[entry.actor] ?? entry.actor}:{" "}
                      {entry.fromStatus && (
                        <>
                          <span className="font-medium">
                            {STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus}
                          </span>{" "}
                          →{" "}
                        </>
                      )}
                      <span className="font-medium">
                        {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
