import type { ReactNode } from "react";
import { ru } from "@/locales";

export const REFERRER_COMPENSATION_TOOLTIP: ReactNode = (
  <div className="flex flex-col gap-2 text-left">
    <p className="m-0 leading-snug">{ru.vacancies.tooltips.compensationP1}</p>
    <p className="m-0 leading-snug opacity-95">{ru.vacancies.tooltips.compensationP2}</p>
  </div>
);

export const VACANCY_APPLICATION_COUNT_TOOLTIP = ru.vacancies.tooltips.applicationCount;
