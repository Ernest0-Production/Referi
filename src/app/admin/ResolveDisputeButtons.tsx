"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

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
      <p className="text-sm font-medium text-green-600">
        Спор закрыт. Обновите страницу для актуального списка.
      </p>
    );
  }

  const isPending = forReferrer.isPending || forSeeker.isPending;

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
        rows={2}
        placeholder="Примечание модератора (необязательно)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={isPending}
      />
      <div className="flex gap-3">
        <button
          onClick={() => forReferrer.mutate({ caseId, notes: notes || undefined })}
          disabled={isPending}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Решить в пользу реферальщика
        </button>
        <button
          onClick={() => forSeeker.mutate({ caseId, notes: notes || undefined })}
          disabled={isPending}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Решить в пользу соискателя
        </button>
      </div>
      {(forReferrer.error ?? forSeeker.error) && (
        <p className="text-sm text-red-500">
          {forReferrer.error?.message ?? forSeeker.error?.message}
        </p>
      )}
      <p className="text-xs text-gray-400">
        Заявка: <code className="rounded bg-gray-50 px-1">{applicationId}</code>
      </p>
    </div>
  );
}
