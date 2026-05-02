import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <main className="flex-1">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground text-2xl font-bold">Кандидаты</h1>
            <p className="text-muted-foreground text-sm">
              {vacancy.title} · {applicants.length} откликов
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/vacancy">← Моя вакансия</Link>
          </Button>
        </div>

        {applicants.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center">
              Откликов пока нет
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {applicants.map((app) => (
              <Card key={app.id}>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0 pb-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-foreground font-medium">{app.seeker?.displayName ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(app.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {STATUS_LABELS[app.status] ?? app.status}
                  </Badge>
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
                      <p className="text-foreground text-sm">{app.contactInfo}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/applications/${app.id}`}>Подробнее</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
