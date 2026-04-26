"use client";

import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationActionsPanel({ applicationId, status }: Props) {
  const router = useRouter();
  const utils = trpcReact.useUtils();

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
      <button
        onClick={() => cancelMutation.mutate({ applicationId: id })}
        disabled={cancelMutation.isPending}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {cancelMutation.isPending ? "…" : "Отозвать"}
      </button>
    );
  }

  if (status === "AWAITING_RESUME_HANDOFF") {
    return (
      <button
        onClick={() => requestCancelMutation.mutate({ applicationId: id })}
        disabled={requestCancelMutation.isPending}
        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 disabled:opacity-60"
      >
        {requestCancelMutation.isPending ? "…" : "Запросить отмену"}
      </button>
    );
  }

  if (status === "AWAITING_COMPANY_DECISION") {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => acceptOfferMutation.mutate({ applicationId: id })}
          disabled={acceptOfferMutation.isPending}
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 hover:bg-green-100 disabled:opacity-60"
        >
          {acceptOfferMutation.isPending ? "…" : "Принять оффер"}
        </button>
        <button
          onClick={() => reportRejectionMutation.mutate({ applicationId: id })}
          disabled={reportRejectionMutation.isPending}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          {reportRejectionMutation.isPending ? "…" : "Получил отказ"}
        </button>
      </div>
    );
  }

  return null;
}
