import { IconUser, IconUsers } from "@tabler/icons-react";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { trpc } from "@/trpc/server";
import { ApplicationReferrerActions } from "@/components/applications/ApplicationReferrerActions";
import { ApplicationLifecycleFlowDiagram } from "@/components/applications/ApplicationLifecycleFlowDiagram";
import { ApplicantContactDisplay } from "@/components/vacancies/ApplicantContactDisplay";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatSeekerApplicationRecencyLabel } from "@/lib/formatSeekerApplicationRecencyLabel";
import { REFERRER_ACTIVE_REVIEW_STATUSES } from "@/shared/types/applicationStatus";
import type { ApplicationStatus } from "@prisma/client";

function isReferrerPipelineStatus(status: ApplicationStatus): boolean {
  return REFERRER_ACTIVE_REVIEW_STATUSES.includes(status);
}

export async function VacancyApplicantsSection({
  vacancyId,
  referrerActions = true,
}: {
  vacancyId: string;
  referrerActions?: boolean;
}) {
  const applicants = await trpc.vacancies.applicants({ vacancyId });
  const pipelineApp = applicants.find((a) => isReferrerPipelineStatus(a.status));

  if (pipelineApp) {
    return (
      <section id="candidates" className="mt-8 flex scroll-mt-24 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground flex items-center gap-2 text-xl font-semibold">
            <IconUser className="text-muted-foreground size-6 shrink-0" aria-hidden />
            Текущий Кандидат
          </h2>
        </div>

        <Card className="gap-2">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between space-y-0 gap-x-4 gap-y-1 pb-1">
            <p className="text-foreground min-w-0 font-medium">
              {pipelineApp.seeker?.displayName ?? "—"}
            </p>
            <p className="text-muted-foreground shrink-0 text-xs sm:text-right">
              {formatSeekerApplicationRecencyLabel(pipelineApp.createdAt)}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-0">
            <div className="flex flex-col gap-1 text-sm">
              {pipelineApp.paymentDeadline ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Оплатить до: {new Date(pipelineApp.paymentDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {pipelineApp.resumeHandoffDeadline ? (
                <p className="text-primary">
                  Передача резюме до:{" "}
                  {new Date(pipelineApp.resumeHandoffDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {pipelineApp.cancelAckDeadline ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Подтвердить отмену до:{" "}
                  {new Date(pipelineApp.cancelAckDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {pipelineApp.companyDecisionDeadline ? (
                <p className="text-muted-foreground">
                  Решение компании до:{" "}
                  {new Date(pipelineApp.companyDecisionDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
            </div>

            {pipelineApp.contactInfo ? (
              <div className="border-border bg-muted/50 rounded-xl border p-3">
                <p className="text-muted-foreground text-xs font-medium">Контакты соискателя</p>
                <ApplicantContactDisplay contactInfo={pipelineApp.contactInfo} className="mt-0.5" />
              </div>
            ) : null}

            <ApplicationLifecycleFlowDiagram
              status={pipelineApp.status}
              auditLogs={pipelineApp.auditLogs}
            />

            {pipelineApp.bio ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">О себе</p>
                <p className="text-foreground text-sm whitespace-pre-wrap">{pipelineApp.bio}</p>
              </div>
            ) : null}

            {referrerActions ? (
              <ApplicationReferrerActions
                applicationId={pipelineApp.id}
                status={pipelineApp.status}
              />
            ) : null}
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section id="candidates" className="mt-8 flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground flex items-center gap-2 text-xl font-semibold">
          <IconUsers className="text-muted-foreground size-6 shrink-0" aria-hidden />
          Кандидаты
        </h2>
        <p className="text-muted-foreground text-sm">
          {formatApplicationCountLabel(applicants.length)}
        </p>
      </div>

      {applicants.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">
            Запросов пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {applicants.map((app) => (
            <Card key={app.id} className="gap-2">
              <CardHeader className="flex flex-row flex-wrap items-start justify-between space-y-0 gap-x-4 gap-y-1 pb-1">
                <p className="text-foreground min-w-0 font-medium">
                  {app.seeker?.displayName ?? "—"}
                </p>
                <p className="text-muted-foreground shrink-0 text-xs sm:text-right">
                  {formatSeekerApplicationRecencyLabel(app.createdAt)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
                {app.bio ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-xs font-medium">О себе</p>
                    <p className="text-foreground line-clamp-3 text-sm">{app.bio}</p>
                  </div>
                ) : null}
                {app.contactInfo ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-xs font-medium">Контакты</p>
                    <ApplicantContactDisplay contactInfo={app.contactInfo} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
