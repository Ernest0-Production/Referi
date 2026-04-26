"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

const SPECIALTIES = [
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
  "OTHER",
] as const;
const GRADES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;
const FORMATS = ["OFFICE", "HYBRID", "REMOTE"] as const;

export function CreateVacancyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    companyName: "",
    specialty: "BACKEND" as (typeof SPECIALTIES)[number],
    grade: "MIDDLE" as (typeof GRADES)[number],
    workFormat: "REMOTE" as (typeof FORMATS)[number],
    salaryFrom: "",
    salaryTo: "",
    description: "",
    rewardKopecks: "0",
  });

  const create = trpcReact.vacancies.create.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate({
      title: form.title,
      companyName: form.companyName,
      specialty: form.specialty,
      grade: form.grade,
      workFormat: form.workFormat,
      salaryFrom: form.salaryFrom ? Number(form.salaryFrom) : undefined,
      salaryTo: form.salaryTo ? Number(form.salaryTo) : undefined,
      description: form.description,
      rewardKopecks: Number(form.rewardKopecks) || 0,
    });
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Название вакансии *
          </label>
          <input
            required
            minLength={3}
            maxLength={200}
            {...field("title")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Senior Backend Engineer"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Компания *</label>
          <input
            required
            minLength={2}
            maxLength={200}
            {...field("companyName")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="ООО Пример"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Специальность</label>
          <select
            {...field("specialty")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Грейд</label>
          <select
            {...field("grade")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Формат</label>
          <select
            {...field("workFormat")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Зарплата от (₽)</label>
          <input
            type="number"
            min={0}
            {...field("salaryFrom")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="100000"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Зарплата до (₽)</label>
          <input
            type="number"
            min={0}
            {...field("salaryTo")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            placeholder="200000"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Бонус реферальщику (₽)
        </label>
        <input
          type="number"
          min={0}
          {...field("rewardKopecks")}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          placeholder="0"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Описание *</label>
        <textarea
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          {...field("description")}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Расскажите о вакансии, требованиях и условиях работы"
        />
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={create.isPending}
        className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {create.isPending ? "Публикация…" : "Опубликовать вакансию"}
      </button>
    </form>
  );
}
