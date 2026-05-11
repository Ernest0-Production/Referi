import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { ru } from "@/locales";
import { ApplicationDetailActions } from "./ApplicationDetailActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = { ...ru.applications.statusDetail };
const ACTOR_LABELS: Record<string, string> = { ...ru.applications.auditActors };

const A = ru.applications;

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
    <main className="flex-1">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6 md:p-8">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/applications">{A.detailBack}</Link>
        </Button>

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
                  {A.payUntil} {new Date(application.paymentDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {application.resumeHandoffDeadline ? (
                <p className="text-primary">
                  {A.resumeHandoffUntil}{" "}
                  {new Date(application.resumeHandoffDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
              {application.companyDecisionDeadline ? (
                <p className="text-muted-foreground">
                  {A.companyDecisionUntil}{" "}
                  {new Date(application.companyDecisionDeadline).toLocaleString("ru-RU")}
                </p>
              ) : null}
            </div>

            {application.content?.contactInfo ? (
              <div className="border-border bg-muted/50 rounded-xl border p-3">
                <p className="text-muted-foreground text-xs font-medium">{A.seekerContacts}</p>
                <p className="text-foreground mt-0.5 text-sm">{application.content.contactInfo}</p>
              </div>
            ) : null}

            {isSeeker && application.content?.bio ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">{A.aboutSeeker}</p>
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
              <CardTitle className="text-base">{A.auditTitle}</CardTitle>
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
