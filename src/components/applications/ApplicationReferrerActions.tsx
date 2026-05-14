"use client";

import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationReferrerActions({ applicationId, status }: Props) {
  const router = useRouter();
  const onDone = () => router.refresh();

  const confirmIntent = trpcReact.applications.confirmIntent.useMutation({ onSuccess: onDone });
  const reject = trpcReact.applications.reject.useMutation({ onSuccess: onDone });
  const confirmHandoff = trpcReact.applications.confirmHandoff.useMutation({ onSuccess: onDone });
  const acknowledgeCancel = trpcReact.applications.acknowledgeCancel.useMutation({
    onSuccess: onDone,
  });
  const confirmRejection = trpcReact.applications.confirmRejection.useMutation({
    onSuccess: onDone,
  });
  const denyRejection = trpcReact.applications.denyRejection.useMutation({ onSuccess: onDone });

  const busy =
    confirmIntent.isPending ||
    reject.isPending ||
    confirmHandoff.isPending ||
    acknowledgeCancel.isPending ||
    confirmRejection.isPending ||
    denyRejection.isPending;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <p className="text-foreground text-sm font-medium">Действия</p>
      <div className="flex flex-wrap gap-2">
        {status === "SUBMITTED" ? (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => confirmIntent.mutate({ applicationId })}
            >
              {confirmIntent.isPending ? "…" : "Подтвердить намерение"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={busy}
              onClick={() => reject.mutate({ applicationId })}
            >
              {reject.isPending ? "…" : "Отклонить запрос"}
            </Button>
          </>
        ) : null}

        {status === "AWAITING_PAYMENT" ? (
          <p className="text-muted-foreground text-sm">
            Ожидается оплата соискателя или автоматический холд. Действий реферальщика нет.
          </p>
        ) : null}

        {status === "AWAITING_RESUME_HANDOFF" ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => confirmHandoff.mutate({ applicationId })}
          >
            {confirmHandoff.isPending ? "…" : "Резюме передано в компанию"}
          </Button>
        ) : null}

        {status === "SEEKER_CANCEL_REQUESTED" ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() => acknowledgeCancel.mutate({ applicationId })}
          >
            {acknowledgeCancel.isPending ? "…" : "Подтвердить возврат соискателю"}
          </Button>
        ) : null}

        {status === "AWAITING_COMPANY_DECISION" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => confirmRejection.mutate({ applicationId })}
            >
              {confirmRejection.isPending ? "…" : "Подтвердить отказ компании"}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => denyRejection.mutate({ applicationId })}
            >
              {denyRejection.isPending ? "…" : "Оспорить (открыть спор)"}
            </Button>
          </>
        ) : null}

        {status === "DISPUTED" ? (
          <p className="text-muted-foreground text-sm">Спор передан модерации. Ожидайте решение.</p>
        ) : null}
      </div>
    </div>
  );
}
