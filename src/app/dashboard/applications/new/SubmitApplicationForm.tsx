"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

export function SubmitApplicationForm({ vacancyId }: { vacancyId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactInfo: "",
    bio: "",
    coverLetter: "",
  });
  const [error, setError] = useState<string | null>(null);

  const submit = trpcReact.applications.submit.useMutation({
    onSuccess() {
      router.push("/dashboard/applications");
    },
    onError(err) {
      const msg = err.message;
      if (msg === "TOO_MANY_ACTIVE_APPLICATIONS") {
        setError("У вас уже есть 2 активные заявки. Дождитесь завершения одной из них.");
      } else if (msg === "ALREADY_APPLIED") {
        setError("Вы уже откликались на эту вакансию.");
      } else if (msg === "VACANCY_NOT_ACTIVE") {
        setError("Вакансия больше не активна.");
      } else {
        setError(err.message);
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    submit.mutate({
      vacancyId,
      contactInfo: form.contactInfo,
      bio: form.bio,
      coverLetter: form.coverLetter || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Контактная информация *
        </label>
        <input
          required
          minLength={1}
          maxLength={500}
          value={form.contactInfo}
          onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="email, Telegram или LinkedIn"
        />
        <p className="mt-0.5 text-xs text-gray-400">
          Видно реферальщику только в активных статусах заявки
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">О себе *</label>
        <textarea
          required
          minLength={10}
          maxLength={1000}
          rows={5}
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Опыт, стек, достижения"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Сопроводительное письмо (необязательно)
        </label>
        <textarea
          maxLength={300}
          rows={3}
          value={form.coverLetter}
          onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Почему именно эта вакансия?"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submit.isPending}
        className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {submit.isPending ? "Отправка…" : "Отправить отклик"}
      </button>
    </form>
  );
}
