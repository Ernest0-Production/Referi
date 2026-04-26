"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  MOBILE: "Mobile",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

interface Vacancy {
  id: string;
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  status: string;
  salaryFromKopecks: string | null;
  salaryToKopecks: string | null;
  rewardKopecks: string;
}

export function ManageVacancyPanel({ vacancy }: { vacancy: Vacancy }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = trpcReact.vacancies.delete.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      setError(err.message);
      setConfirmDelete(false);
    },
  });

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">{vacancy.title}</h2>
          <p className="text-sm text-gray-500">{vacancy.companyName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            vacancy.status === "ACTIVE"
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {vacancy.status === "ACTIVE" ? "Активна" : "Заморожена"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-blue-700">
          {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600">{vacancy.grade}</span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-600">
          {vacancy.workFormat}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <a
          href={`/dashboard/vacancy/applicants`}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Кандидаты
        </a>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Удалить вакансию
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Подтвердить?</span>
            <button
              onClick={() => del.mutate({ id: vacancy.id })}
              disabled={del.isPending}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {del.isPending ? "Удаление…" : "Да, удалить"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
