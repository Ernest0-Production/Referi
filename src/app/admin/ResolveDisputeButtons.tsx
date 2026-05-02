"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  caseId: string;
  applicationId: string;
}

export function ResolveDisputeButtons({ caseId, applicationId }: Props) {
  const [notes, setNotes] = useState("");
  const [resolved, setResolved] = useState(false);
  const utils = trpcReact.useUtils();

  const forReferrer = trpcReact.moderation.resolveForReferrer.useMutation({
    onSuccess: () => {
      setResolved(true);
      void utils.moderation.openCases.invalidate();
    },
  });

  const forSeeker = trpcReact.moderation.resolveForSeeker.useMutation({
    onSuccess: () => {
      setResolved(true);
      void utils.moderation.openCases.invalidate();
    },
  });

  if (resolved) {
    return (
      <p className="text-muted-foreground text-sm font-medium">
        Спор закрыт. Обновите страницу для актуального списка.
      </p>
    );
  }

  const isPending = forReferrer.isPending || forSeeker.isPending;
  const errMsg = forReferrer.error?.message ?? forSeeker.error?.message;

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor="mod-notes">Примечание модератора (необязательно)</FieldLabel>
        <Textarea
          id="mod-notes"
          rows={2}
          placeholder="Примечание модератора (необязательно)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isPending}
          onClick={() => forReferrer.mutate({ caseId, notes: notes || undefined })}
        >
          Решить в пользу реферальщика
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => forSeeker.mutate({ caseId, notes: notes || undefined })}
        >
          Решить в пользу соискателя
        </Button>
      </div>
      {errMsg ? (
        <Alert variant="destructive">
          <AlertDescription>{errMsg}</AlertDescription>
        </Alert>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Заявка: <code className="bg-muted rounded px-1 font-mono">{applicationId}</code>
      </p>
    </FieldGroup>
  );
}
