"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

export function UpdateProfileForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = trpcReact.auth.updateProfile.useMutation({
    onSuccess() {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        update.mutate({ displayName: name });
      }}
      className="space-y-3"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
        maxLength={100}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="Отображаемое имя"
      />
      <button
        type="submit"
        disabled={update.isPending || name.trim().length < 2}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {update.isPending ? "Сохранение…" : "Сохранить"}
      </button>
      {saved && <p className="text-xs text-green-600">Сохранено</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
