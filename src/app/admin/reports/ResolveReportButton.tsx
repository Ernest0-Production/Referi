"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

interface Props {
  reportId: string;
  vacancyId?: string;
}

export function ResolveReportButton({ reportId, vacancyId }: Props) {
  const [resolution, setResolution] = useState("");
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
    return <p className="text-sm font-medium text-green-600">Жалоба закрыта.</p>;
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-300 focus:outline-none"
        rows={2}
        placeholder="Решение (обязательно)"
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        disabled={resolve.isPending}
      />
      {vacancyId && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={blockVacancy}
            onChange={(e) => setBlockVacancy(e.target.checked)}
            className="rounded"
          />
          Заблокировать вакансию
        </label>
      )}
      <button
        onClick={() =>
          resolve.mutate({
            reportId,
            resolution,
            blockVacancy: vacancyId ? blockVacancy : undefined,
          })
        }
        disabled={resolve.isPending || !resolution.trim()}
        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
      >
        Закрыть жалобу
      </button>
      {resolve.error && <p className="text-sm text-red-500">{resolve.error.message}</p>}
    </div>
  );
}
