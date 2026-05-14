import { cn } from "@/lib/utils";
import {
  REFERRAL_FLOW_STEPS,
  flowStepIndexForStatus,
  isTerminalApplicationStatus,
} from "@/lib/applicationFlowGraph";

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Подана",
  AWAITING_PAYMENT: "Ожидает оплаты",
  AWAITING_RESUME_HANDOFF: "Передача резюме",
  SEEKER_CANCEL_REQUESTED: "Запрос на отмену",
  AWAITING_COMPANY_DECISION: "На рассмотрении в компании",
  OFFER_ACCEPTED: "Оффер принят",
  REJECTED_BY_REFERRER: "Отклонена реферальщиком",
  REJECTED_BY_COMPANY: "Отказ компании",
  CANCELLED: "Отменена",
  DISPUTED: "Спор",
  REFUNDED_BY_CANCEL_ACK: "Возврат (отмена)",
  REFUNDED_BY_CANCEL_AUTO: "Автовозврат (отмена)",
  REFUNDED_BY_SLA: "Возврат (SLA)",
  REFUNDED_BY_VACANCY_DELETED: "Возврат (рефералка удалена)",
  REFUNDED_BY_MODERATOR: "Возврат по решению модератора",
};

type AuditEntry = {
  fromStatus: string | null;
  toStatus: string;
};

function maxReachedStepIndex(status: string, audit: AuditEntry[]): number {
  let max = Math.max(0, flowStepIndexForStatus(status));
  for (const e of audit) {
    const a = e.fromStatus != null ? flowStepIndexForStatus(e.fromStatus) : -1;
    const b = flowStepIndexForStatus(e.toStatus);
    max = Math.max(max, a, b);
  }
  return max;
}

function visibleFlowSteps(status: string, auditLogs: AuditEntry[]) {
  return REFERRAL_FLOW_STEPS.filter((step) => {
    if (step.key !== "cancel_req") return true;
    return (
      status === "SEEKER_CANCEL_REQUESTED" ||
      auditLogs.some(
        (e) =>
          e.toStatus === "SEEKER_CANCEL_REQUESTED" || e.fromStatus === "SEEKER_CANCEL_REQUESTED",
      )
    );
  });
}

export function ApplicationLifecycleFlowDiagram({
  status,
  auditLogs,
}: {
  status: string;
  auditLogs: AuditEntry[];
}) {
  const steps = visibleFlowSteps(status, auditLogs);
  const currentIdx = flowStepIndexForStatus(status);
  const terminal = isTerminalApplicationStatus(status);
  const reachedMax = maxReachedStepIndex(status, auditLogs);

  return (
    <div className={cn("flex flex-col gap-0", terminal && "opacity-[0.85]")}>
      <h3 className="text-foreground mb-3 text-sm font-semibold">Этапы заявки</h3>
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const stepActive = !terminal && step.statuses.includes(status);
          const stepIdx = REFERRAL_FLOW_STEPS.indexOf(step);
          const isPast = !terminal && reachedMax > stepIdx && !stepActive;
          const isCurrent = stepActive;
          const isFuture = !terminal && !isPast && !isCurrent;

          return (
            <div key={step.key} className="flex flex-col">
              <div
                className={cn(
                  "flex flex-col gap-1 rounded-lg border px-3 py-2.5",
                  isCurrent &&
                    "border-primary bg-primary/8 ring-primary/25 dark:bg-primary/15 shadow-sm ring-1",
                  isPast && "border-muted-foreground/25 bg-muted/40 opacity-90",
                  isFuture && "border-muted-foreground/30 bg-muted/15 border-dashed",
                  terminal && "border-muted-foreground/20 bg-muted/25 opacity-80",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground text-sm font-medium">{step.title}</span>
                  {isPast ? (
                    <span className="text-muted-foreground text-xs" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                      сейчас
                    </span>
                  ) : null}
                  {isFuture ? (
                    <span className="text-muted-foreground text-xs">ожидается</span>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs leading-snug">
                  {step.statuses.map((s) => STATUS_LABELS[s] ?? s).join(" · ")}
                </p>
              </div>
              {i < steps.length - 1 && step.outgoingHint ? (
                <div className="text-muted-foreground flex items-stretch gap-2 py-1 pl-2">
                  <div className="bg-muted-foreground/35 mt-0.5 w-px shrink-0" />
                  <p className="text-xs leading-snug italic">{step.outgoingHint}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {terminal ? (
        <div
          className={cn(
            "mt-4 rounded-lg border px-3 py-2.5",
            status === "OFFER_ACCEPTED"
              ? "border-emerald-600/40 bg-emerald-600/10 dark:bg-emerald-950/30"
              : "border-border bg-card",
          )}
        >
          <p className="text-muted-foreground text-xs font-medium">Итог</p>
          <p className="text-foreground mt-0.5 text-sm font-semibold">
            {STATUS_LABELS[status] ?? status}
          </p>
        </div>
      ) : null}

      {currentIdx < 0 && !terminal ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Текущее состояние: {STATUS_LABELS[status] ?? status}
        </p>
      ) : null}
    </div>
  );
}
