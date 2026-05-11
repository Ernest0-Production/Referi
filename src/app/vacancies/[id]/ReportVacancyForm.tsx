"use client";

import { IconFlag } from "@tabler/icons-react";
import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { ModerationContactLink } from "@/components/ModerationContactLink";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ru } from "@/locales";

const R = ru.vacancies.report;
const REASON_VALUES = ["FAKE_VACANCY", "INAPPROPRIATE_BEHAVIOR", "FRAUD", "OTHER"] as const;
type ReportReason = (typeof REASON_VALUES)[number];

const reasonOptions: { value: ReportReason; label: string }[] = REASON_VALUES.map((value) => ({
  value,
  label: R.reasons[value],
}));

export function ReportVacancyForm({ vacancyId }: { vacancyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("FAKE_VACANCY");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = trpcReact.reports.submitAbuseReport.useMutation({
    onSuccess() {
      setMsg("registered");
      setOpen(false);
      setComment("");
    },
    onError(err) {
      setMsg(err.message);
    },
  });

  if (!open) {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full justify-end">
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            <IconFlag data-icon="inline-start" className="size-4 shrink-0" aria-hidden />
            {R.trigger}
          </Button>
        </div>
        {msg === "registered" ? (
          <Alert className="w-full">
            <AlertTitle>{R.successTitle}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{R.successBody}</span>
              <ModerationContactLink />
            </AlertDescription>
          </Alert>
        ) : null}
        {msg && msg !== "registered" ? (
          <p className="text-muted-foreground w-full text-left text-xs">{msg}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="w-full border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{R.cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="report-reason">{R.reasonLabel}</FieldLabel>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ReportReason)}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {reasonOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-comment">{R.commentLabel}</FieldLabel>
            <Textarea
              id="report-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={submit.isPending}
              onClick={() =>
                submit.mutate({ vacancyId, reason, comment: comment.trim() || undefined })
              }
            >
              {R.submit}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {R.cancel}
            </Button>
          </div>
        </FieldGroup>
        {msg === "registered" ? (
          <div className="text-muted-foreground flex flex-col gap-2 border-t pt-3 text-sm">
            <span className="text-foreground">{R.successInline}</span>
            <ModerationContactLink />
          </div>
        ) : null}
        {msg && msg !== "registered" ? <p className="text-destructive text-xs">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
