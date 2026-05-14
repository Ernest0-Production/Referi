"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Props {
  reportId: string;
  vacancyId?: string;
}

export function ResolveReportButton({ reportId, vacancyId }: Props) {
  const [resolution, setResolution] = useState("");
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [blockVacancy, setBlockVacancy] = useState(false);
  const [resolved, setResolved] = useState(false);
  const utils = trpcReact.useUtils();

  const resolve = trpcReact.moderation.resolveAbuseReport.useMutation({
    onSuccess: () => {
      setResolved(true);
      void utils.moderation.abuseReports.invalidate();
    },
  });

  if (resolved) {
    return <p className="text-muted-foreground text-sm font-medium">Жалоба закрыта.</p>;
  }

  return (
    <FieldGroup>
      <Field data-invalid={resolutionError ? "true" : undefined}>
        <FieldLabel htmlFor="report-resolution">Решение (обязательно)</FieldLabel>
        <Textarea
          id="report-resolution"
          rows={2}
          placeholder="Решение (обязательно)"
          value={resolution}
          aria-invalid={resolutionError ? true : undefined}
          aria-describedby="report-resolution-desc"
          onChange={(e) => {
            setResolutionError(null);
            setResolution(e.target.value);
          }}
          disabled={resolve.isPending}
        />
        <FieldDescription
          id="report-resolution-desc"
          className={resolutionError ? "text-destructive" : undefined}
        >
          {resolutionError ?? "Обязательное поле."}
        </FieldDescription>
      </Field>
      {vacancyId ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id="block-vacancy"
            checked={blockVacancy}
            onCheckedChange={(v) => setBlockVacancy(v === true)}
            disabled={resolve.isPending}
          />
          <Label htmlFor="block-vacancy" className="text-muted-foreground text-sm font-normal">
            Заблокировать рефералку
          </Label>
        </div>
      ) : null}
      <Button
        type="button"
        disabled={resolve.isPending}
        onClick={() => {
          if (!resolution.trim()) {
            setResolutionError("Укажи текст решения.");
            return;
          }
          setResolutionError(null);
          resolve.mutate({
            reportId,
            resolution,
            blockVacancy: vacancyId ? blockVacancy : undefined,
          });
        }}
      >
        Закрыть жалобу
      </Button>
      {resolve.error ? (
        <Alert variant="destructive">
          <AlertDescription>{resolve.error.message}</AlertDescription>
        </Alert>
      ) : null}
    </FieldGroup>
  );
}
