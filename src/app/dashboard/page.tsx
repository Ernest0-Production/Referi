import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

const ACTIVE_STATUSES = [
  "SUBMITTED",
  "AWAITING_PAYMENT",
  "AWAITING_RESUME_HANDOFF",
  "SEEKER_CANCEL_REQUESTED",
  "AWAITING_COMPANY_DECISION",
  "DISPUTED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Подана",
  AWAITING_PAYMENT: "Ожидает оплаты",
  AWAITING_RESUME_HANDOFF: "Ожидает передачи резюме",
  SEEKER_CANCEL_REQUESTED: "Запрошена отмена",
  AWAITING_COMPANY_DECISION: "На рассмотрении компании",
  DISPUTED: "Спор",
};

function nearestDeadline(app: {
  paymentDeadline?: Date | null;
  resumeHandoffDeadline?: Date | null;
  companyDecisionDeadline?: Date | null;
}): Date | null {
  const candidates = [
    app.paymentDeadline,
    app.resumeHandoffDeadline,
    app.companyDecisionDeadline,
  ].filter(Boolean) as Date[];
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (a < b ? a : b));
}

function daysLeft(d: Date): number {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [user, activeApplications, vacancyData, attemptData] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, roles: true },
    }),
    // Seeker: active applications with deadlines
    prisma.application.findMany({
      where: {
        seekerId: userId,
        status: { in: [...ACTIVE_STATUSES] },
      },
      include: {
        vacancy: { select: { title: true, companyName: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Referrer: active vacancy + applicant count
    prisma.vacancy.findFirst({
      where: { referrerId: userId, status: { in: ["ACTIVE", "FROZEN"] } },
      select: {
        id: true,
        title: true,
        companyName: true,
        status: true,
        _count: { select: { applications: true } },
      },
    }),
    // Referrer: attempt pool
    prisma.referrerAttemptLedger.findMany({
      where: { referrerId: userId },
    }),
  ]);

  const isReferrer = user?.roles.includes("REFERRER") ?? false;
  const isSeeker = user?.roles.includes("SEEKER") ?? false;
  const isModerator =
    (user?.roles.includes("MODERATOR") ?? false) || (user?.roles.includes("ADMIN") ?? false);

  const now = new Date();
  const activeConsumed = attemptData.filter(
    (e) => e.event === "CONSUMED" && e.regeneratesAt && e.regeneratesAt > now,
  );
  const availableAttempts = Math.max(
    0,
    BUSINESS_RULES.MAX_REFERRER_ATTEMPTS - activeConsumed.length,
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <span className="font-bold text-gray-900">Referi</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" className="text-sm text-gray-500 hover:text-gray-900">
            Настройки
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- NextAuth signOut GET */}
          <a href="/api/auth/signout" className="text-sm text-gray-400 hover:text-gray-600">
            Выйти
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Добро пожаловать{user?.displayName ? `, ${user.displayName}` : ""}!
          </h1>
          <div className="mt-1 flex gap-2">
            {user?.roles.map((r) => (
              <span
                key={r}
                className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Link
            href="/vacancies"
            className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition hover:border-blue-200 hover:shadow-sm"
          >
            <div className="text-lg font-bold text-blue-600">Вакансии</div>
            <div className="text-xs text-gray-400">Каталог</div>
          </Link>
          {isSeeker && (
            <Link
              href="/dashboard/applications"
              className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition hover:border-blue-200 hover:shadow-sm"
            >
              <div className="text-lg font-bold text-gray-800">{activeApplications.length}</div>
              <div className="text-xs text-gray-400">Активных заявок</div>
            </Link>
          )}
          {isReferrer && (
            <>
              <Link
                href="/dashboard/vacancy"
                className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="text-lg font-bold text-gray-800">
                  {vacancyData ? vacancyData._count.applications : "—"}
                </div>
                <div className="text-xs text-gray-400">Откликов</div>
              </Link>
              <Link
                href="/dashboard/attempts"
                className="rounded-2xl border border-gray-100 bg-white p-4 text-center transition hover:border-blue-200 hover:shadow-sm"
              >
                <div className="text-lg font-bold text-blue-600">{availableAttempts}</div>
                <div className="text-xs text-gray-400">Попыток</div>
              </Link>
            </>
          )}
          {isModerator && (
            <Link
              href="/admin"
              className="rounded-2xl border border-red-50 bg-white p-4 text-center transition hover:border-red-100 hover:shadow-sm"
            >
              <div className="text-lg font-bold text-red-600">Admin</div>
              <div className="text-xs text-gray-400">Панель</div>
            </Link>
          )}
        </div>

        {/* Seeker: active applications with deadlines */}
        {isSeeker && activeApplications.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Активные заявки
            </h2>
            {activeApplications.map((app) => {
              const deadline = nearestDeadline(app);
              const days = deadline ? daysLeft(deadline) : null;
              return (
                <Link
                  key={app.id}
                  href={`/dashboard/applications/${app.id}`}
                  className="block rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-blue-100 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{app.vacancy.title}</p>
                      <p className="text-sm text-gray-500">{app.vacancy.companyName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        {STATUS_LABELS[app.status] ?? app.status}
                      </span>
                      {days !== null && (
                        <p
                          className={`mt-1 text-xs ${days <= 1 ? "font-semibold text-red-500" : "text-gray-400"}`}
                        >
                          {days === 0 ? "Дедлайн сегодня" : `${days} дн. до дедлайна`}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/dashboard/applications"
              className="block text-sm text-blue-600 hover:underline"
            >
              Все заявки →
            </Link>
          </section>
        )}

        {/* Referrer: vacancy summary */}
        {isReferrer && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Моя вакансия
            </h2>
            {vacancyData ? (
              <a
                href="/dashboard/vacancy"
                className="block rounded-2xl border border-gray-100 bg-white p-4 transition hover:border-blue-100 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{vacancyData.title}</p>
                    <p className="text-sm text-gray-500">{vacancyData.companyName}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${vacancyData.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                      }`}
                  >
                    {vacancyData.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {vacancyData._count.applications} откликов
                </p>
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center">
                <p className="text-sm text-gray-500">У вас нет активной вакансии.</p>
                <a
                  href="/dashboard/vacancy"
                  className="mt-3 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Создать вакансию
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
