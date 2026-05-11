import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { ApplicationActionsPanel } from "./ApplicationActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
  REFUNDED_BY_VACANCY_DELETED: "Возврат (рефералка)",
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
    <main className="flex-1">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-foreground text-2xl font-bold">Мои заявки</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Найти рефералки</Link>
          </Button>
        </div>

        {applications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <p className="text-muted-foreground">У вас пока нет заявок</p>
              <Button asChild>
                <Link href="/">Смотреть рефералки</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Активные ({active.length})
            </h2>
            {active.map((app) => (
              <Card key={app.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-foreground font-semibold">{app.vacancy.title}</p>
                    <p className="text-muted-foreground text-sm">{app.vacancy.companyName}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pb-4">
                  {app.paymentDeadline ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Оплатить до:{" "}
                      {new Date(app.paymentDeadline).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/applications/${app.id}`}>Подробнее</Link>
                    </Button>
                    <ApplicationActionsPanel applicationId={app.id} status={app.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {closed.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Завершённые ({closed.length})
            </h2>
            {closed.map((app) => (
              <Card key={app.id} className="opacity-80">
                <CardContent className="flex items-center justify-between gap-4 py-5">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-foreground font-medium">{app.vacancy.title}</p>
                    <p className="text-muted-foreground text-sm">{app.vacancy.companyName}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
