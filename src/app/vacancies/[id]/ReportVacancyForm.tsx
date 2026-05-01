"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

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
      setMsg("Жалоба отправлена модераторам.");
      setOpen(false);
      setComment("");
    },
    onError(err) {
      setMsg(err.message);
    },
  });

  if (!open) {
    return (
      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-amber-700 underline-offset-2 hover:underline"
        >
          Пожаловаться на вакансию
        </button>
        {msg && <p className="mt-2 text-xs text-gray-600">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
      <p className="text-sm font-medium text-gray-800">Жалоба на вакансию</p>
      <label className="block text-xs text-gray-600">Причина</label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as (typeof REASONS)[number]["value"])}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      >
        {REASONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <label className="block text-xs text-gray-600">Комментарий (необязательно)</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={3}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submit.isPending}
          onClick={() => submit.mutate({ vacancyId, reason, comment: comment.trim() || undefined })}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Отправить
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-white"
        >
          Отмена
        </button>
      </div>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
