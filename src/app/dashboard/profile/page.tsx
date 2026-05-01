import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { UpdateProfileForm } from "./UpdateProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <a href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Referi
        </a>
        <span className="text-sm text-gray-500">{me.displayName}</span>
      </nav>

      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
          <p className="mt-1 text-sm text-gray-500">Управление вашими данными</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Основная информация</h2>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">GitHub:</span>
            <span>{me.githubLogin ?? "—"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">Email:</span>
            <span>{me.email ?? "—"}</span>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <span className="font-medium">Контакт:</span>
            <p>{me.contactInfo ?? "—"}</p>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <span className="font-medium">Биография:</span>
            <p className="whitespace-pre-wrap">{me.bio ?? "—"}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="font-medium">Роли:</span>
            <span>{me.roles.join(", ")}</span>
          </div>
          {me.roles.includes("REFERRER") && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">Доступных попыток:</span>
              <span>{me.availableAttempts}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="mb-4 font-semibold text-gray-800">Редактирование профиля</h2>
          <UpdateProfileForm
            currentName={me.displayName}
            currentContactInfo={me.contactInfo}
            currentBio={me.bio}
            currentRoles={me.roles}
          />
        </div>
      </div>
    </main>
  );
}
