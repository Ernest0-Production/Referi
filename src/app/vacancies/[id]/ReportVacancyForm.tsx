"use client";

import { IconFlag } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpcReact } from "@/trpc/client";
import { ModerationContactLink } from "@/components/ModerationContactLink";
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
  { value: "FAKE_VACANCY", label: "Подозрение в фейковой рефералке" },
  { value: "INAPPROPRIATE_BEHAVIOR", label: "Неприемлемое поведение" },
  { value: "FRAUD", label: "Мошенничество" },
  { value: "OTHER", label: "Другое" },
] as const;

export function ReportVacancyForm({ vacancyId }: { vacancyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("FAKE_VACANCY");
  const [comment, setComment] = useState("");

  const submit = trpcReact.reports.submitAbuseReport.useMutation({
    onSuccess() {
      setOpen(false);
      setComment("");
      toast.success("Жалоба зарегистрирована", {
        description: (
          <div className="flex flex-col gap-2">
            <span>Модераторы увидят её в системе.</span>
            <ModerationContactLink className="text-sm font-medium text-blue-600 hover:underline" />
          </div>
        ),
      });
    },
    onError(err) {
      toast.error(err.message || "Не удалось отправить жалобу");
    },
  });

  if (!open) {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full justify-end">
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            <IconFlag data-icon="inline-start" className="size-4 shrink-0" aria-hidden />
            Пожаловаться
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Жалоба на рефералку</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="report-reason">Причина</FieldLabel>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as (typeof REASONS)[number]["value"])}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
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
              onClick={() =>
                submit.mutate({ vacancyId, reason, comment: comment.trim() || undefined })
              }
            >
              Отправить
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
