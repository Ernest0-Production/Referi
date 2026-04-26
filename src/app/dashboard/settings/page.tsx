import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateProfileForm } from "@/app/dashboard/profile/UpdateProfileForm";
import { TelegramLinkSection } from "./TelegramLinkSection";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, telegramLink, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, roles: true },
    }),
    prisma.telegramLink.findUnique({
      where: { userId },
      select: { telegramUsername: true, createdAt: true },
    }),
    prisma.seekerSubscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <Link href="/dashboard" className="font-bold text-gray-900 hover:text-blue-600">
          Referi
        </Link>
        <span className="text-sm text-gray-500">Настройки</span>
      </nav>

      <div className="mx-auto max-w-2xl space-y-8 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Настройки аккаунта</h1>

        {/* Profile section */}
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Профиль</h2>
          <div>
            <p className="text-xs text-gray-400">GitHub аккаунт</p>
            <p className="text-sm text-gray-700">{session.user.name ?? "—"}</p>
          </div>
          <UpdateProfileForm currentName={user.displayName ?? ""} />
        </section>

        {/* Subscription section */}
        <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Подписка</h2>
          {subscription ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${subscription.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {subscription.status === "ACTIVE" ? "PRO" : subscription.status}
                </span>
              </div>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  Действует до:{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">У вас нет активной подписки PRO.</p>
              <Link
                href="/subscribe"
                className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Оформить PRO подписку
              </Link>
            </div>
          )}
        </section>

        {/* Telegram section */}
        <TelegramLinkSection telegramLink={telegramLink} />

        {/* Roles section */}
        <section className="space-y-2 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Роли</h2>
          <div className="flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {role}
              </span>
            ))}
          </div>
        </section>

        {/* Quick links */}
        <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="font-semibold text-gray-800">Быстрые ссылки</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link href="/dashboard/attempts" className="text-blue-600 hover:underline">
              Пул попыток реферала
            </Link>
            <Link href="/dashboard/vacancy" className="text-blue-600 hover:underline">
              Моя вакансия
            </Link>
            <Link href="/dashboard/applications" className="text-blue-600 hover:underline">
              Мои заявки
            </Link>
            <Link href="/vacancies" className="text-blue-600 hover:underline">
              Все вакансии
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
