"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationDetailActions({ applicationId, status }: Props) {
  const router = useRouter();
  const [abuseReason, setAbuseReason] = useState("");
  const [showAbuse, setShowAbuse] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);

  function onSuccess() {
    router.refresh();
  }

  const cancelMutation = trpcReact.applications.cancel.useMutation({ onSuccess });
  const requestCancelMutation = trpcReact.applications.requestCancel.useMutation({ onSuccess });
  const acceptOfferMutation = trpcReact.applications.acceptOffer.useMutation({ onSuccess });
  const reportRejectionMutation = trpcReact.applications.reportRejection.useMutation({
    onSuccess,
  });
  const abuseReportMutation = trpcReact.reports.submitAbuseReport.useMutation({
    onSuccess() {
      setShowAbuse(false);
      setAbuseReason("");
    },
    onError(err) {
      setAbuseError(err.message);
    },
  });

  const id = applicationId;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap gap-2">
        {(status === "SUBMITTED" || status === "AWAITING_PAYMENT") && (
          <button
            onClick={() => cancelMutation.mutate({ applicationId: id })}
            disabled={cancelMutation.isPending}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelMutation.isPending ? "…" : "Отозвать заявку"}
          </button>
        )}

        {status === "AWAITING_RESUME_HANDOFF" && (
          <button
            onClick={() => requestCancelMutation.mutate({ applicationId: id })}
            disabled={requestCancelMutation.isPending}
            className="rounded-xl border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
            {requestCancelMutation.isPending ? "…" : "Запросить отмену"}
          </button>
        )}

        {status === "AWAITING_COMPANY_DECISION" && (
          <>
            <button
              onClick={() => acceptOfferMutation.mutate({ applicationId: id })}
              disabled={acceptOfferMutation.isPending}
              className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {acceptOfferMutation.isPending ? "…" : "Принять оффер"}
            </button>
            <button
              onClick={() => reportRejectionMutation.mutate({ applicationId: id })}
              disabled={reportRejectionMutation.isPending}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
            >
              {reportRejectionMutation.isPending ? "…" : "Получил отказ"}
            </button>
          </>
        )}

        {!["CANCELLED", "REJECTED_BY_REFERRER", "OFFER_ACCEPTED"].includes(status) && (
          <button
            onClick={() => setShowAbuse((v) => !v)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Пожаловаться
          </button>
        )}
      </div>

      {showAbuse && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Причина жалобы</p>
          <textarea
            rows={3}
            value={abuseReason}
            onChange={(e) => setAbuseReason(e.target.value)}
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none"
            placeholder="Опишите, что произошло"
          />
          {abuseError && <p className="text-xs text-red-600">{abuseError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() =>
                abuseReportMutation.mutate({
                  reason: "OTHER",
                  comment: abuseReason,
                })
              }
              disabled={abuseReportMutation.isPending || abuseReason.trim().length < 5}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {abuseReportMutation.isPending ? "…" : "Отправить"}
            </button>
            <button
              onClick={() => setShowAbuse(false)}
              className="rounded-lg border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-white"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
