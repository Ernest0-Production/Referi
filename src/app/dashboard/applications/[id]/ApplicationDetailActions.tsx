"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { ModerationContactLink } from "@/components/ModerationContactLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationDetailActions({ applicationId, status }: Props) {
  const router = useRouter();
  const [abuseReason, setAbuseReason] = useState("");
  const [showAbuse, setShowAbuse] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);
  const [abuseSuccess, setAbuseSuccess] = useState(false);

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
      setAbuseSuccess(true);
      setShowAbuse(false);
      setAbuseReason("");
      setAbuseError(null);
    },
    onError(err) {
      setAbuseError(err.message);
    },
  });

  const id = applicationId;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap gap-2">
        {(status === "SUBMITTED" || status === "AWAITING_PAYMENT") && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate({ applicationId: id })}
          >
            {cancelMutation.isPending ? "…" : "Отозвать заявку"}
          </Button>
        )}

        {status === "AWAITING_RESUME_HANDOFF" && (
          <Button
            variant="outline"
            size="sm"
            disabled={requestCancelMutation.isPending}
            onClick={() => requestCancelMutation.mutate({ applicationId: id })}
          >
            {requestCancelMutation.isPending ? "…" : "Запросить отмену"}
          </Button>
        )}

        {status === "AWAITING_COMPANY_DECISION" && (
          <>
            <Button
              size="sm"
              disabled={acceptOfferMutation.isPending}
              onClick={() => acceptOfferMutation.mutate({ applicationId: id })}
            >
              {acceptOfferMutation.isPending ? "…" : "Принять оффер"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={reportRejectionMutation.isPending}
              onClick={() => reportRejectionMutation.mutate({ applicationId: id })}
            >
              {reportRejectionMutation.isPending ? "…" : "Получил отказ"}
            </Button>
          </>
        )}

        {!["CANCELLED", "REJECTED_BY_REFERRER", "OFFER_ACCEPTED"].includes(status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAbuse((v) => !v);
              setAbuseSuccess(false);
            }}
          >
            Пожаловаться
          </Button>
        )}
      </div>

      {abuseSuccess ? (
        <Alert>
          <AlertTitle>Жалоба зарегистрирована</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>При необходимости уточнений можно связаться с модерацией по ссылке ниже.</span>
            <ModerationContactLink />
          </AlertDescription>
        </Alert>
      ) : null}

      {showAbuse ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Причина жалобы</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="abuse-detail">Опишите ситуацию</FieldLabel>
                <Textarea
                  id="abuse-detail"
                  rows={3}
                  value={abuseReason}
                  onChange={(e) => setAbuseReason(e.target.value)}
                  placeholder="Опишите, что произошло"
                />
              </Field>
            </FieldGroup>
            {abuseError ? (
              <Alert variant="destructive">
                <AlertDescription>{abuseError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={abuseReportMutation.isPending || abuseReason.trim().length < 5}
                onClick={() =>
                  abuseReportMutation.mutate({
                    reason: "OTHER",
                    comment: abuseReason,
                  })
                }
              >
                {abuseReportMutation.isPending ? "…" : "Отправить"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAbuse(false)}>
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
