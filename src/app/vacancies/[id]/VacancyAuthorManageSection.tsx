import Link from "next/link";
import { trpc } from "@/trpc/server";
import { ApplicationLifecycleFlowDiagram } from "@/components/applications/ApplicationLifecycleFlowDiagram";
import { ApplicationReferrerActions } from "@/components/applications/ApplicationReferrerActions";
import { VacancyApplicantsSection } from "@/app/(account)/vacancy/VacancyApplicantsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  DISPUTED: "Спор",
  REFUNDED_BY_CANCEL_ACK: "Возврат (подтверждена отмена)",
  REFUNDED_BY_SLA: "Возврат (SLA)",
  REFUNDED_BY_CANCEL_AUTO: "Автоматический возврат",
  REFUNDED_BY_VACANCY_DELETED: "Возврат (рефералка удалена)",
  REFUNDED_BY_MODERATOR: "Возврат по решению модератора",
};

export async function VacancyAuthorManageSection({
  vacancyId,
  vacancyTitle,
  applicationId: applicationIdParam,
}: {
  vacancyId: string;
  vacancyTitle: string;
  applicationId?: string;
}) {
  const applicants = await trpc.vacancies.applicants({ vacancyId });

  const selected =
    applicationIdParam && applicants.some((a) => a.id === applicationIdParam)
      ? applicationIdParam
      : undefined;

  if (!selected) {
    return <VacancyApplicantsSection vacancyId={vacancyId} vacancyTitle={vacancyTitle} />;
  }

  const application = await trpc.applications.getById({ applicationId: selected });
  if (application.vacancy.id !== vacancyId) {
    return <VacancyApplicantsSection vacancyId={vacancyId} vacancyTitle={vacancyTitle} />;
  }

  const auditLog = await trpc.applications.getAuditLog({ applicationId: selected });
  const row = applicants.find((a) => a.id === selected);
  const seekerName = row?.seeker?.displayName ?? "Кандидат";

  return (
    <section className="flex scroll-mt-24 flex-col gap-4">
      <Button variant="outline" size="sm" className="w-fit" asChild>
        <Link href={`/vacancies/${vacancyId}`}>К списку кандидатов</Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0 pb-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Текущий кандидат</CardTitle>
            <p className="text-foreground font-medium">{seekerName}</p>
            <p className="text-muted-foreground text-xs">
              Заявка от {new Date(application.createdAt).toLocaleDateString("ru-RU")}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {STATUS_LABELS[application.status] ?? application.status}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
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
            {application.cancelAckDeadline ? (
              <p className="text-amber-600 dark:text-amber-400">
                Подтвердить отмену до:{" "}
                {new Date(application.cancelAckDeadline).toLocaleString("ru-RU")}
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

          {application.content?.bio ? (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs font-medium">О себе</p>
              <p className="text-foreground text-sm whitespace-pre-wrap">
                {application.content.bio}
              </p>
            </div>
          ) : null}

          <ApplicationLifecycleFlowDiagram status={application.status} auditLogs={auditLog} />

          <ApplicationReferrerActions applicationId={selected} status={application.status} />
        </CardContent>
      </Card>
    </section>
  );
}
