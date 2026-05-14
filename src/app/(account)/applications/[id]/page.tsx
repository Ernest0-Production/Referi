import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { dashboardApplicationDetailTrail } from "@/lib/navBreadcrumbTrail";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";
import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { ApplicationDetailActions } from "./ApplicationDetailActions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  REFUNDED_BY_VACANCY_DELETED: "Возврат (рефералка удалена)",
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

  if (application.vacancy.referrerId) {
    redirect(`/vacancies/${application.vacancy.id}?applicationId=${encodeURIComponent(id)}`);
  }

  const auditLog = await trpc.applications.getAuditLog({ applicationId: id });

  const isSeeker = application.content !== null;

  return (
    <main className="flex-1">
      <div className={PAGE_COLUMN_CLASS}>
        <BreadcrumbSeedPort seed={dashboardApplicationDetailTrail()} />
        <AppNavBreadcrumb />

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{application.vacancy.title}</CardTitle>
              <p className="text-muted-foreground text-sm">{application.vacancy.companyName}</p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {STATUS_LABELS[application.status] ?? application.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              {application.paymentDeadline ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Оплатить до: {new Date(application.paymentDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {application.resumeHandoffDeadline ? (
                <p className="text-primary">
                  Передача резюме до:{" "}
                  {new Date(application.resumeHandoffDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {application.companyDecisionDeadline ? (
                <p className="text-muted-foreground">
                  Решение компании до:{" "}
                  {new Date(application.companyDecisionDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
            </div>

            {application.content?.contactInfo ? (
              <div className="border-border bg-muted/50 rounded-xl border p-3">
                <p className="text-muted-foreground text-xs font-medium">Контакты соискателя</p>
                <p className="text-foreground mt-0.5 text-sm">{application.content.contactInfo}</p>
              </div>
            ) : null}

            {isSeeker && application.content?.bio ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">О себе</p>
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {application.content.bio}
                </p>
              </div>
            ) : null}

            <ApplicationDetailActions applicationId={id} status={application.status} />
          </CardContent>
        </Card>

        {auditLog.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">История изменений</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {auditLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      {new Date(entry.createdAt).toLocaleString("ru-RU")}
                    </span>
                    <p className="text-foreground">
                      {ACTOR_LABELS[entry.actor] ?? entry.actor}:{" "}
                      {entry.fromStatus ? (
                        <>
                          <span className="font-medium">
                            {STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus}
                          </span>{" "}
                          →{" "}
                        </>
                      ) : null}
                      <span className="font-medium">
                        {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
