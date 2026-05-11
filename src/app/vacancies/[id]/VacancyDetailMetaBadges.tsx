"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ApplicationCountIcon,
  GradeIcon,
  SpecialtyIcon,
  WorkFormatIcon,
} from "@/components/vacancy/VacancyFieldIcons";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { VACANCY_APPLICATION_COUNT_TOOLTIP } from "@/lib/vacancyTooltipMessages";
import {
  VACANCY_GRADE_LABELS,
  VACANCY_SPECIALTY_LABELS,
  VACANCY_WORK_FORMAT_LABELS,
} from "../vacancyPublicFieldLabels";

type VacancyDetailMetaBadgesProps = {
  specialty: string;
  grade: string;
  workFormat: string;
  applicationCount: number;
};

export function VacancyDetailMetaBadges({
  specialty,
  grade,
  workFormat,
  applicationCount,
}: VacancyDetailMetaBadgesProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="font-normal">
            <SpecialtyIcon specialty={specialty} className="text-current" />
            {VACANCY_SPECIALTY_LABELS[specialty] ?? specialty}
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
            {VACANCY_GRADE_LABELS[grade] ?? grade}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          Грейд
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="font-normal">
            <WorkFormatIcon format={workFormat} className="text-current" />
            {VACANCY_WORK_FORMAT_LABELS[workFormat] ?? workFormat}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4}>
          Формат работы
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="font-normal">
            <ApplicationCountIcon className="text-current" />
            {formatApplicationCountLabel(applicationCount)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4} className="max-w-xs text-left leading-snug">
          {VACANCY_APPLICATION_COUNT_TOOLTIP}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
