"use client";

import {
  mergeVacancyListQueryParams,
  parseCsvEnumParam,
  serializeCsvParam,
  type VacancyListFlatSearchParams,
  VACANCY_LIST_GRADE_VALUES,
  VACANCY_LIST_SPECIALTY_VALUES,
  VACANCY_LIST_WORK_FORMAT_VALUES,
} from "@/lib/vacancyListQuery";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SPECIALTIES: { value: (typeof VACANCY_LIST_SPECIALTY_VALUES)[number]; label: string }[] = [
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

const GRADES: { value: (typeof VACANCY_LIST_GRADE_VALUES)[number]; label: string }[] = [
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const FORMATS: { value: (typeof VACANCY_LIST_WORK_FORMAT_VALUES)[number]; label: string }[] = [
  { value: "REMOTE", label: "Удалённо" },
  { value: "HYBRID", label: "Гибрид" },
  { value: "OFFICE", label: "Офис" },
];

interface Props {
  currentParams: VacancyListFlatSearchParams;
  listPath?: string;
}

function toggleCsvParam<T extends string>(
  current: string | undefined,
  allowed: readonly T[],
  value: T,
): string | undefined {
  const selected = new Set(parseCsvEnumParam(current, allowed) ?? []);
  if (selected.has(value)) selected.delete(value);
  else selected.add(value);
  const ordered = allowed.filter((a) => selected.has(a));
  return serializeCsvParam(ordered);
}

export function VacancyFilters({ currentParams, listPath = "/" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(currentParams.query ?? "");
  const [salaryFrom, setSalaryFrom] = useState(currentParams.salaryFrom ?? "");

  function apply(patch: Partial<VacancyListFlatSearchParams>) {
    const q = mergeVacancyListQueryParams(currentParams, patch);
    const qs = q.toString();
    router.push(`${listPath}${qs ? "?" + qs : ""}`);
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
            onKeyDown={(e) => e.key === "Enter" && apply({ query: query.trim() || undefined })}
            placeholder="Название или описание"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Сортировка</label>
        <select
          value={currentParams.sort ?? "created_desc"}
          onChange={(e) => apply({ sort: e.target.value || undefined })}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="created_desc">Сначала новые</option>
          <option value="salary_desc">По зарплате (убыв.)</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Специальность</label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => {
            const selected =
              parseCsvEnumParam(currentParams.specialty, VACANCY_LIST_SPECIALTY_VALUES)?.includes(s.value) ??
              false;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  apply({
                    specialty: toggleCsvParam(currentParams.specialty, VACANCY_LIST_SPECIALTY_VALUES, s.value),
                  })
                }
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Грейд</label>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => {
            const selected =
              parseCsvEnumParam(currentParams.grade, VACANCY_LIST_GRADE_VALUES)?.includes(g.value) ?? false;
            return (
              <button
                key={g.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  apply({
                    grade: toggleCsvParam(currentParams.grade, VACANCY_LIST_GRADE_VALUES, g.value),
                  })
                }
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Формат работы</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => {
            const selected =
              parseCsvEnumParam(currentParams.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES)?.includes(f.value) ??
              false;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={selected}
                onClick={() =>
                  apply({
                    workFormat: toggleCsvParam(currentParams.workFormat, VACANCY_LIST_WORK_FORMAT_VALUES, f.value),
                  })
                }
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Зарплата не ниже (₽)</label>
        <input
          type="number"
          min={0}
          value={salaryFrom}
          onChange={(e) => setSalaryFrom(e.target.value)}
          onBlur={() => apply({ salaryFrom: salaryFrom.trim() || undefined })}
          placeholder="Минимум"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm [appearance:textfield] focus:border-blue-500 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      <button
        type="button"
        onClick={() => router.push(listPath)}
        className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}
