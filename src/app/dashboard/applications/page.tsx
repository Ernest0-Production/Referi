import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { ru } from "@/locales";
import { ApplicationActionsPanel } from "./ApplicationActionsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = { ...ru.applications.statusList };

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

const A = ru.applications;

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
          <h1 className="text-foreground text-2xl font-bold">{A.pageTitle}</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">{A.findVacancies}</Link>
          </Button>
        </div>

        {applications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10">
              <p className="text-muted-foreground">{A.emptyTitle}</p>
              <Button asChild>
                <Link href="/">{A.browseVacancies}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {A.activeSection(active.length)}
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
                      {A.payUntil}{" "}
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
                      <Link href={`/dashboard/applications/${app.id}`}>{ru.common.moreDetails}</Link>
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
              {A.closedSection(closed.length)}
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
