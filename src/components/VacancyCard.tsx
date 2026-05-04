import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatVacancySalaryRange, type VacancySalaryCurrency } from "@/lib/vacancySalaryCurrency";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  MOBILE: "Mobile",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<string, string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

interface Vacancy {
  id: string;
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  salaryCurrency: VacancySalaryCurrency;
  salaryFromKopecks: string | null;
  salaryToKopecks: string | null;
  rewardKopecks: string;
  createdAt: Date;
  updatedAt: Date;
}

function formatUpdatedRelative(updatedAt: Date): string {
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  const diffSec = Math.round((updatedAt.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "обновлено только что";
  if (abs < 3600) return `обновлено ${rtf.format(Math.round(diffSec / 60), "minute")}`;
  if (abs < 86400) return `обновлено ${rtf.format(Math.round(diffSec / 3600), "hour")}`;
  return `обновлено ${rtf.format(Math.round(diffSec / 86400), "day")}`;
}

export function VacancyCard({
  vacancy,
  hasActiveSeekerApplication = false,
  detailHref,
}: {
  vacancy: Vacancy;
  hasActiveSeekerApplication?: boolean;
  detailHref?: string;
}) {
  const salary = formatVacancySalaryRange(
    vacancy.salaryFromKopecks,
    vacancy.salaryToKopecks,
    vacancy.salaryCurrency,
  );
  const reward = Math.round(Number(vacancy.rewardKopecks) / 100);
  const href = detailHref ?? `/vacancies/${vacancy.id}`;

  return (
    <Link
      href={href}
      className="group block transition-shadow hover:shadow-md"
    >
      <Card className="border-border bg-card overflow-hidden shadow-sm transition-colors group-hover:bg-sky-100 dark:group-hover:bg-sky-500/25">
        <CardHeader className="flex flex-col gap-3 space-y-0 pt-5 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="text-muted-foreground truncate text-sm font-medium">
                {vacancy.companyName}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="font-normal">
                  {FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}
                </Badge>
                <Badge variant="secondary" className="font-normal">
                  {GRADE_LABELS[vacancy.grade] ?? vacancy.grade}
                </Badge>
                {hasActiveSeekerApplication ? (
                  <Badge
                    variant="outline"
                    className="border-primary/60 text-primary dark:border-primary/50 font-medium"
                  >
                    Активная заявка
                  </Badge>
                ) : null}
              </div>
            </div>
            <time
              className="text-muted-foreground shrink-0 text-xs"
              dateTime={vacancy.updatedAt.toISOString()}
            >
              {formatUpdatedRelative(vacancy.updatedAt)}
            </time>
          </div>
          <h3 className="text-foreground text-lg leading-snug font-bold tracking-tight md:text-xl">
            {vacancy.title}
          </h3>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-normal">
              {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
            </Badge>
            {salary ? (
              <Badge variant="outline" className="font-normal">
                {salary}
              </Badge>
            ) : null}
            {reward > 0 ? (
              <Badge
                className={cn(
                  "border-transparent font-medium",
                  "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
                )}
              >
                Бонус:{" "}
                {new Intl.NumberFormat("ru-RU", {
                  style: "currency",
                  currency: "RUB",
                  maximumFractionDigits: 0,
                }).format(reward)}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
