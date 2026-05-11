import Link from "next/link";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { trpc } from "@/trpc/server";
import { ru } from "@/locales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const STATUS_LABELS: Record<string, string> = { ...ru.applications.statusReferrer };

const C = ru.applications.candidates;
const com = ru.common;

export async function VacancyApplicantsSection({
  vacancyId,
  vacancyTitle,
}: {
  vacancyId: string;
  vacancyTitle: string;
}) {
  const applicants = await trpc.vacancies.applicants({ vacancyId });

  return (
    <section id="candidates" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-foreground text-xl font-semibold">{C.title}</h2>
        <p className="text-muted-foreground text-sm">
          {vacancyTitle} · {formatApplicationCountLabel(applicants.length)}
        </p>
      </div>

      {applicants.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center">{C.empty}</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {applicants.map((app) => (
            <Card key={app.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0 pb-2">
                <div className="flex flex-col gap-0.5">
                  <p className="text-foreground font-medium">{app.seeker?.displayName ?? com.dash}</p>
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
                    <p className="text-muted-foreground text-xs font-medium">{C.about}</p>
                    <p className="text-foreground line-clamp-3 text-sm">{app.bio}</p>
                  </div>
                ) : null}
                {app.contactInfo ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground text-xs font-medium">{C.contacts}</p>
                    <p className="text-foreground text-sm">{app.contactInfo}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/applications/${app.id}`}>{com.moreDetails}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
