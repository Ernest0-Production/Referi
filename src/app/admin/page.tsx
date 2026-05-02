import { trpc } from "@/trpc/server";
import { ResolveDisputeButtons } from "./ResolveDisputeButtons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function AdminDisputesPage() {
  const cases = await trpc.moderation.openCases();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">Открытые споры</h1>
        <p className="text-muted-foreground text-sm">
          {cases.length === 0
            ? "Нет открытых споров."
            : `${cases.length} спор(ов) ожидают решения.`}
        </p>
      </div>

      {cases.map((c) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
            <div className="flex flex-col gap-1">
              <p className="text-foreground font-semibold">
                {c.application.vacancy.title} — {c.application.vacancy.companyName}
              </p>
              <p className="text-muted-foreground text-sm">
                Соискатель: {c.application.seeker.displayName ?? c.application.seeker.id}
              </p>
              <p className="text-muted-foreground text-xs">
                Заявка:{" "}
                <code className="bg-muted rounded px-1 font-mono text-xs">{c.application.id}</code>
              </p>
              <p className="text-muted-foreground text-xs">
                Спор открыт:{" "}
                {new Date(c.createdAt).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {c.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <ResolveDisputeButtons caseId={c.id} applicationId={c.application.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
