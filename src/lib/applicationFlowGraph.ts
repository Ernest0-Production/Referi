import { TERMINAL_STATUSES } from "@/shared/types/applicationStatus";

/** Вертикальные этапы «основной колонки» для визуализации на странице вакансии */
export const REFERRAL_FLOW_STEPS: {
  key: string;
  title: string;
  statuses: readonly string[];
  /** Подпись между этим этапом и следующим: кто может перевести дальше */
  outgoingHint?: string;
}[] = [
  {
    key: "submitted",
    title: "Запрос получен",
    statuses: ["SUBMITTED"],
    outgoingHint: "Реферальщик: подтвердить намерение или отклонить. Соискатель: отозвать.",
  },
  {
    key: "payment",
    title: "Оплата и холд",
    statuses: ["AWAITING_PAYMENT"],
    outgoingHint:
      "После успешной оплаты (или при нулевом вознаграждении) — автоматический переход. Соискатель может отозвать до оплаты.",
  },
  {
    key: "resume",
    title: "Передача резюме",
    statuses: ["AWAITING_RESUME_HANDOFF"],
    outgoingHint: "Реферальщик: подтвердить передачу в компанию. Соискатель: запросить отмену.",
  },
  {
    key: "cancel_req",
    title: "Запрос отмены соискателя",
    statuses: ["SEEKER_CANCEL_REQUESTED"],
    outgoingHint: "Реферальщик: подтвердить возврат. Иначе по SLA — автоматическое подтверждение.",
  },
  {
    key: "company",
    title: "Решение компании",
    statuses: ["AWAITING_COMPANY_DECISION"],
    outgoingHint:
      "Соискатель: принять оффер / заявить отказ. Реферальщик: подтвердить отказ компании или оспорить.",
  },
  {
    key: "disputed",
    title: "Спор (модерация)",
    statuses: ["DISPUTED"],
    outgoingHint: "Дальнейшие переходы — только модератор.",
  },
];

const TERMINAL_SET = new Set<string>(TERMINAL_STATUSES);

export function isTerminalApplicationStatus(status: string): boolean {
  return TERMINAL_SET.has(status);
}

/** Индекс шага в REFERRAL_FLOW_STEPS или -1 если не попали в колонку */
export function flowStepIndexForStatus(status: string): number {
  const i = REFERRAL_FLOW_STEPS.findIndex((s) => s.statuses.includes(status));
  return i;
}
