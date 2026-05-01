"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";

interface Props {
  vacancyId: string;
  paidTokenId?: string;
  defaultContactInfo?: string;
  defaultBio?: string;
}

export function SubmitApplicationForm({
  vacancyId,
  paidTokenId,
  defaultContactInfo,
  defaultBio,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactInfo: defaultContactInfo ?? "",
    bio: defaultBio ?? "",
    coverLetter: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | undefined>(paidTokenId);

  const submit = trpcReact.applications.submit.useMutation({
    onSuccess() {
      router.push("/dashboard/applications");
    },
    onError(err) {
      const msg = err.message;
      if (msg === "ACTIVE_APPLICATION_LIMIT_REACHED") {
        setError("Достигнут лимит активных откликов. Купите дополнительный токен или дождитесь завершения заявки.");
      } else if (msg === "DUPLICATE_APPLICATION") {
        setError("Вы уже откликались на эту вакансию.");
      } else if (msg === "VACANCY_NOT_ACTIVE") {
        setError("Вакансия больше не активна.");
      } else if (msg.startsWith("PAID_TOKEN_")) {
        setError("Токен отклика недействителен. Купите новый токен для этой вакансии.");
      } else {
        setError(err.message);
      }
    },
  });

  const buyToken = trpcReact.payments.initiatePaidApplicationToken.useMutation({
    onSuccess(data) {
      setTokenId(data.tokenId);
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    },
    onError(err) {
      setError(err.message);
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
      paidTokenId: tokenId,
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

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-800">Разовый токен отклика (199 ₽)</p>
        <p className="mt-1 text-xs text-gray-500">
          Если бесплатный лимит активных откликов исчерпан, купите токен для этой вакансии.
        </p>
        {tokenId ? (
          <p className="mt-2 text-xs text-green-700">Токен активирован для текущей заявки.</p>
        ) : (
          <button
            type="button"
            onClick={() => buyToken.mutate({ vacancyId })}
            disabled={buyToken.isPending}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
          >
            {buyToken.isPending ? "Переход к оплате…" : "Купить токен"}
          </button>
        )}
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
