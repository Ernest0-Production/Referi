"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { ModerationContactLink } from "@/components/ModerationContactLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ru } from "@/locales";

interface Props {
  applicationId: string;
  status: string;
}

export function ApplicationDetailActions({ applicationId, status }: Props) {
  const router = useRouter();
  const [abuseReason, setAbuseReason] = useState("");
  const [abuseDetailError, setAbuseDetailError] = useState<string | null>(null);
  const [showAbuse, setShowAbuse] = useState(false);
  const [abuseError, setAbuseError] = useState<string | null>(null);
  const [abuseSuccess, setAbuseSuccess] = useState(false);
  const act = ru.applications.actions;
  const ab = ru.applications.abuse;
  const c = ru.common;

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
            {cancelMutation.isPending ? c.ellipsis : act.withdrawDetail}
          </Button>
        )}

        {status === "AWAITING_RESUME_HANDOFF" && (
          <Button
            variant="outline"
            size="sm"
            disabled={requestCancelMutation.isPending}
            onClick={() => requestCancelMutation.mutate({ applicationId: id })}
          >
            {requestCancelMutation.isPending ? c.ellipsis : act.requestCancel}
          </Button>
        )}

        {status === "AWAITING_COMPANY_DECISION" && (
          <>
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
          </>
        )}

        {!["CANCELLED", "REJECTED_BY_REFERRER", "OFFER_ACCEPTED"].includes(status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAbuse((v) => !v);
              setAbuseSuccess(false);
              setAbuseDetailError(null);
            }}
          >
            {act.report}
          </Button>
        )}
      </div>

      {abuseSuccess ? (
        <Alert>
          <AlertTitle>{ab.successTitle}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{ab.successDescription}</span>
            <ModerationContactLink />
          </AlertDescription>
        </Alert>
      ) : null}

      {showAbuse ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{ab.reasonTitle}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Field data-invalid={abuseDetailError ? "true" : undefined}>
                <FieldLabel htmlFor="abuse-detail">{ab.situationLabel}</FieldLabel>
                <Textarea
                  id="abuse-detail"
                  rows={3}
                  value={abuseReason}
                  aria-invalid={abuseDetailError ? true : undefined}
                  aria-describedby="abuse-detail-desc"
                  onChange={(e) => {
                    setAbuseDetailError(null);
                    setAbuseReason(e.target.value);
                  }}
                  placeholder={ab.situationPlaceholder}
                />
                <FieldDescription
                  id="abuse-detail-desc"
                  className={abuseDetailError ? "text-destructive" : undefined}
                >
                  {abuseDetailError ?? ab.situationHint}
                </FieldDescription>
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
                disabled={abuseReportMutation.isPending}
                onClick={() => {
                  setAbuseDetailError(null);
                  if (abuseReason.trim().length < 5) {
                    setAbuseDetailError(ab.situationError);
                    return;
                  }
                  abuseReportMutation.mutate({
                    reason: "OTHER",
                    comment: abuseReason,
                  });
                }}
              >
                {abuseReportMutation.isPending ? c.ellipsis : act.send}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAbuse(false)}>
                {c.cancel}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
