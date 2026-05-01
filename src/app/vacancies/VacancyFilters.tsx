"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SPECIALTIES = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "FULLSTACK", label: "Fullstack" },
  { value: "MOBILE", label: "Mobile" },
  { value: "DEVOPS", label: "DevOps" },
  { value: "QA", label: "QA" },
  { value: "DATA", label: "Data" },
  { value: "ML_AI", label: "ML / AI" },
  { value: "SECURITY", label: "Security" },
  { value: "OTHER", label: "Другое" },
];

const GRADES = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const FORMATS = [
  { value: "REMOTE", label: "Удалённо" },
  { value: "HYBRID", label: "Гибрид" },
  { value: "OFFICE", label: "Офис" },
];

interface Props {
  currentParams: Record<string, string | undefined>;
}

export function VacancyFilters({ currentParams }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(currentParams.query ?? "");
  const [salaryFrom, setSalaryFrom] = useState(currentParams.salaryFrom ?? "");
  const [salaryTo, setSalaryTo] = useState(currentParams.salaryTo ?? "");

  function apply(updates: Record<string, string | undefined>) {
    const merged = { ...currentParams, ...updates, page: "1" };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
      .join("&");
    router.push(`/vacancies${qs ? "?" + qs : ""}`);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Поиск</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply({ query: query || undefined })}
            placeholder="Название или описание"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Сортировка</label>
        <select
          value={currentParams.sort ?? "created_desc"}
          onChange={(e) => apply({ sort: e.target.value || "created_desc" })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="created_desc">Сначала новые</option>
          <option value="salary_desc">По зарплате (убыв.)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Специальность</label>
        <select
          value={currentParams.specialty ?? ""}
          onChange={(e) => apply({ specialty: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Все</option>
          {SPECIALTIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Грейд</label>
        <select
          value={currentParams.grade ?? ""}
          onChange={(e) => apply({ grade: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Все</option>
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Формат работы</label>
        <select
          value={currentParams.workFormat ?? ""}
          onChange={(e) => apply({ workFormat: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">Все</option>
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Зарплата (RUB)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={salaryFrom}
            onChange={(e) => setSalaryFrom(e.target.value)}
            onBlur={() => apply({ salaryFrom: salaryFrom || undefined })}
            placeholder="От"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={salaryTo}
            onChange={(e) => setSalaryTo(e.target.value)}
            onBlur={() => apply({ salaryTo: salaryTo || undefined })}
            placeholder="До"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        onClick={() => router.push("/vacancies")}
        className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
