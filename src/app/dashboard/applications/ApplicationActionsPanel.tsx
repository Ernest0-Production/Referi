"use client";

import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { ru } from "@/locales";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationActionsPanel({ applicationId, status }: Props) {
  const router = useRouter();
  const utils = trpcReact.useUtils();
  const act = ru.applications.actions;
  const c = ru.common;

  function refresh() {
    void utils.applications.myList.invalidate();
    router.refresh();
  }

  const cancelMutation = trpcReact.applications.cancel.useMutation({ onSuccess: refresh });
  const requestCancelMutation = trpcReact.applications.requestCancel.useMutation({
    onSuccess: refresh,
  });
  const reportRejectionMutation = trpcReact.applications.reportRejection.useMutation({
    onSuccess: refresh,
  });
  const acceptOfferMutation = trpcReact.applications.acceptOffer.useMutation({
    onSuccess: refresh,
  });

  const id = applicationId;

  if (status === "SUBMITTED" || status === "AWAITING_PAYMENT") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-destructive"
        disabled={cancelMutation.isPending}
        onClick={() => cancelMutation.mutate({ applicationId: id })}
      >
        {cancelMutation.isPending ? c.ellipsis : act.withdraw}
      </Button>
    );
  }

  if (status === "AWAITING_RESUME_HANDOFF") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={requestCancelMutation.isPending}
        onClick={() => requestCancelMutation.mutate({ applicationId: id })}
      >
        {requestCancelMutation.isPending ? c.ellipsis : act.requestCancel}
      </Button>
    );
  }

  if (status === "AWAITING_COMPANY_DECISION") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={acceptOfferMutation.isPending}
          onClick={() => acceptOfferMutation.mutate({ applicationId: id })}
        >
          {acceptOfferMutation.isPending ? c.ellipsis : act.acceptOffer}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={reportRejectionMutation.isPending}
          onClick={() => reportRejectionMutation.mutate({ applicationId: id })}
        >
          {reportRejectionMutation.isPending ? c.ellipsis : act.gotRejection}
        </Button>
      </div>
    );
  }

  return null;
}
