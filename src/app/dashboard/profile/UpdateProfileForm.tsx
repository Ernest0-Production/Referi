"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

interface Props {
  currentName: string;
  currentContactInfo?: string | null;
  currentBio?: string | null;
  currentRoles?: string[];
}

export function UpdateProfileForm({
  currentName,
  currentContactInfo,
  currentBio,
  currentRoles,
}: Props) {
  const [name, setName] = useState(currentName);
  const [contactInfo, setContactInfo] = useState(currentContactInfo ?? "");
  const [bio, setBio] = useState(currentBio ?? "");
  const [roles, setRoles] = useState<string[]>(
    currentRoles?.filter((r) => r === "SEEKER" || r === "REFERRER") ?? ["SEEKER"],
  );
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
        update.mutate({
          displayName: name,
          contactInfo: contactInfo || undefined,
          bio: bio || undefined,
          roles: roles as ("SEEKER" | "REFERRER")[],
        });
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Роли</label>
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-200 px-3 py-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={roles.includes("SEEKER")}
              onChange={(e) =>
                setRoles((prev) =>
                  e.target.checked ? Array.from(new Set([...prev, "SEEKER"])) : prev.filter((r) => r !== "SEEKER"),
                )
              }
            />
            Соискатель
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={roles.includes("REFERRER")}
              onChange={(e) =>
                setRoles((prev) =>
                  e.target.checked
                    ? Array.from(new Set([...prev, "REFERRER"]))
                    : prev.filter((r) => r !== "REFERRER"),
                )
              }
            />
            Реферальщик
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Имя / псевдоним</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={100}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Отображаемое имя"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Контактная информация (мессенджер, email, ссылка)
        </label>
        <input
          type="text"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          maxLength={500}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="@username / email / ссылка"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Краткая биография</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          placeholder="Кратко о вашем опыте"
        />
      </div>

      <button
        type="submit"
        disabled={update.isPending || name.trim().length < 2 || roles.length === 0}
        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {update.isPending ? "Сохранение…" : "Сохранить"}
      </button>
      {saved && <p className="text-xs text-green-600">Сохранено</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
