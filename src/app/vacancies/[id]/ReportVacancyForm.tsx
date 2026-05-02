"use client";

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

const REASONS = [
  { value: "FAKE_VACANCY", label: "Подозрение в фейковой вакансии" },
  { value: "INAPPROPRIATE_BEHAVIOR", label: "Неприемлемое поведение" },
  { value: "FRAUD", label: "Мошенничество" },
  { value: "OTHER", label: "Другое" },
] as const;

export function ReportVacancyForm({ vacancyId }: { vacancyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("FAKE_VACANCY");
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
      <div className="flex w-full flex-col gap-3 border-t pt-4">
        <Button type="button" variant="link" className="h-auto self-start p-0" onClick={() => setOpen(true)}>
          Пожаловаться на вакансию
        </Button>
        {msg === "registered" ? (
          <Alert>
            <AlertTitle>Жалоба зарегистрирована</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>Модераторы увидят её в системе.</span>
              <ModerationContactLink />
            </AlertDescription>
          </Alert>
        ) : null}
        {msg && msg !== "registered" ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      </div>
    );
  }

  return (
    <Card className="w-full border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Жалоба на вакансию</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="report-reason">Причина</FieldLabel>
            <Select value={reason} onValueChange={(v) => setReason(v as (typeof REASONS)[number]["value"])}>
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="report-comment">Комментарий (необязательно)</FieldLabel>
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
              onClick={() => submit.mutate({ vacancyId, reason, comment: comment.trim() || undefined })}
            >
              Отправить
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </FieldGroup>
        {msg === "registered" ? (
          <div className="flex flex-col gap-2 border-t pt-3 text-sm text-muted-foreground">
            <span className="text-foreground">Жалоба зарегистрирована.</span>
            <ModerationContactLink />
          </div>
        ) : null}
        {msg && msg !== "registered" ? <p className="text-xs text-destructive">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
