"use client";

import Link from "next/link";
import { IconCoins } from "@tabler/icons-react";
import { HandCoins } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { formatVacancySalaryRange, type VacancySalaryCurrency } from "@/lib/vacancySalaryCurrency";
import {
  REFERRER_COMPENSATION_TOOLTIP,
  VACANCY_APPLICATION_COUNT_TOOLTIP,
} from "@/lib/vacancyTooltipMessages";
import {
  ApplicationCountIcon,
  GradeIcon,
  SpecialtyIcon,
  WorkFormatIcon,
} from "@/components/vacancy/VacancyFieldIcons";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  IOS_MOBILE: "iOS",
  ANDROID_MOBILE: "Android",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
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
  applicationCount: number;
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
  isViewed = false,
  detailHref,
  onBeforeNavigateToDetail,
}: {
  vacancy: Vacancy;
  hasActiveSeekerApplication?: boolean;
  isViewed?: boolean;
  detailHref?: string;
  onBeforeNavigateToDetail?: () => void;
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
      onClick={() => {
        onBeforeNavigateToDetail?.();
      }}
    >
      <Card className="border-border bg-card relative overflow-hidden shadow-sm transition-colors group-hover:bg-sky-100 dark:group-hover:bg-sky-500/25">
        <CardHeader className="flex w-full min-w-0 flex-col gap-2 space-y-0">
          <div className="flex w-full min-w-0 items-start justify-between gap-2 sm:gap-3">
            <span className="text-muted-foreground min-w-0 flex-1 truncate pr-2 text-sm font-medium">
              {vacancy.companyName}
            </span>
            <time
              className="text-muted-foreground pointer-events-none max-w-[11.5rem] shrink-0 self-start pt-0.5 text-end text-xs leading-tight"
              dateTime={vacancy.updatedAt.toISOString()}
            >
              {formatUpdatedRelative(vacancy.updatedAt)}
            </time>
          </div>
          <h3
            className={cn(
              "text-lg leading-snug font-bold tracking-tight md:text-xl",
              isViewed ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {vacancy.title}
          </h3>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="font-normal">
                  <SpecialtyIcon specialty={vacancy.specialty} className="text-current" />
                  {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Специализация
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="font-normal">
                  <GradeIcon className="text-current" />
                  {GRADE_LABELS[vacancy.grade] ?? vacancy.grade}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Грейд
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="font-normal">
                  <WorkFormatIcon format={vacancy.workFormat} className="text-current" />
                  {FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                Формат работы
              </TooltipContent>
            </Tooltip>
            {salary ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      "border-transparent font-medium",
                      "bg-emerald-600/15 text-emerald-800 dark:text-emerald-200",
                    )}
                  >
                    <IconCoins className="shrink-0 text-current" aria-hidden stroke={1.75} />
                    {salary}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  Зарплата
                </TooltipContent>
              </Tooltip>
            ) : null}
            {reward > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      "border-transparent font-medium",
                      "bg-red-600/15 text-red-800 dark:text-red-200",
                    )}
                  >
                    <HandCoins className="shrink-0 text-current" aria-hidden />
                    {new Intl.NumberFormat("ru-RU", {
                      style: "currency",
                      currency: "RUB",
                      maximumFractionDigits: 0,
                    }).format(reward)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={4}
                  className="max-w-xs items-start text-left leading-snug"
                >
                  {REFERRER_COMPENSATION_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {vacancy.applicationCount > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="font-normal">
                    <ApplicationCountIcon className="text-current" />
                    {formatApplicationCountLabel(vacancy.applicationCount)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={4}
                  className="max-w-xs text-left leading-snug"
                >
                  {VACANCY_APPLICATION_COUNT_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {hasActiveSeekerApplication ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="bg-primary/15 text-primary dark:bg-primary/25 border-transparent font-medium"
                  >
                    Активная заявка
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={4}
                  className="max-w-xs text-left leading-snug"
                >
                  У тебя уже есть активная заявка по этой рефералке
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
