import { trpc } from "@/trpc/server";
import { ResolveReportButton } from "./ResolveReportButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function AdminReportsPage() {
  const reports = await trpc.moderation.abuseReports({ resolved: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">Жалобы</h1>
        <p className="text-muted-foreground text-sm">
          {reports.length === 0
            ? "Нет нерассмотренных жалоб."
            : `${reports.length} жалоб(а) ожидают рассмотрения.`}
        </p>
      </div>

      {reports.map((r) => (
        <Card key={r.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1">
              <p className="text-foreground font-semibold">
                {r.reason}
                {r.vacancy ? (
                  <span className="text-muted-foreground ml-2 font-normal">
                    — {r.vacancy.title}
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground text-sm">
                От: {r.reporter.displayName ?? r.reporter.id}
              </p>
              {r.comment ? <p className="text-muted-foreground text-sm">«{r.comment}»</p> : null}
              <p className="text-muted-foreground text-xs">
                {new Date(r.createdAt).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge variant="destructive" className="shrink-0">
              Новая
            </Badge>
          </CardHeader>
          <CardContent>
            <ResolveReportButton reportId={r.id} vacancyId={r.vacancyId ?? undefined} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
