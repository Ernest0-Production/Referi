"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GradeIcon, SpecialtyIcon, WorkFormatIcon } from "@/components/vacancy/VacancyFieldIcons";
import {
  VACANCY_GRADE_LABELS,
  VACANCY_SPECIALTY_LABELS,
  VACANCY_WORK_FORMAT_LABELS,
} from "../vacancyPublicFieldLabels";
import { ru } from "@/locales";

const M = ru.vacancies.meta;

type VacancyDetailMetaBadgesProps = {
  specialty: string;
  grade: string;
  workFormat: string;
};

export function VacancyDetailMetaBadges({
  specialty,
  grade,
  workFormat,
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
          {M.specialty}
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
          {M.grade}
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
          {M.workFormat}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
