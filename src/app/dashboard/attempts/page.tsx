import { redirect } from "next/navigation";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY));
}

export default async function AttemptsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();

  const ledger = await prisma.referrerAttemptLedger.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const activeConsumed = ledger.filter(
    (e) => e.event === "CONSUMED" && e.regeneratesAt && e.regeneratesAt > now,
  );

  const available = Math.max(0, BUSINESS_RULES.MAX_REFERRER_ATTEMPTS - activeConsumed.length);

  const returned = ledger.filter((e) => e.event === "RETURNED");
  const regenerated = ledger.filter((e) => e.event === "REGENERATED");

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <ServiceBrandLink />
        <span className="text-sm text-gray-500">Попытки реферала</span>
      </nav>

      <div className="mx-auto max-w-3xl space-y-8 p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пул попыток</h1>
          <p className="mt-1 text-sm text-gray-500">
            Каждая публикация вакансии расходует 1 попытку. Попытки восстанавливаются через 60 дней.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{available}</p>
            <p className="mt-1 text-xs text-gray-500">Доступно</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{activeConsumed.length}</p>
            <p className="mt-1 text-xs text-gray-500">Использовано</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">
              {BUSINESS_RULES.MAX_REFERRER_ATTEMPTS}
            </p>
            <p className="mt-1 text-xs text-gray-500">Максимум</p>
          </div>
        </div>

        {/* Active consumed attempts with regeneration countdown */}
        {activeConsumed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              Использованные попытки
            </h2>
            {activeConsumed.map((e) => (
              <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Потрачена{" "}
                      {new Date(e.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {e.applicationId && (
                      <p className="text-xs text-gray-400">Заявка: {e.applicationId}</p>
                    )}
                  </div>
                  {e.regeneratesAt && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Восстановится через</p>
                      <p className="font-semibold text-blue-600">
                        {daysUntil(e.regeneratesAt)} дн.
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(e.regeneratesAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {ledger.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-gray-400 uppercase">
              История ({ledger.length} записей)
            </h2>
            <div className="divide-y divide-gray-50 rounded-2xl border border-gray-100 bg-white">
              {ledger.slice(0, 20).map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        e.event === "CONSUMED"
                          ? "bg-red-400"
                          : e.event === "RETURNED"
                            ? "bg-green-400"
                            : "bg-blue-400"
                      }`}
                    />
                    <span className="text-gray-600">
                      {e.event === "CONSUMED"
                        ? "Потрачена"
                        : e.event === "RETURNED"
                          ? "Возвращена"
                          : "Regenerated"}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              ))}
              {ledger.length > 20 && (
                <p className="px-4 py-2 text-xs text-gray-400">
                  + ещё {ledger.length - 20} записей
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-800">Статистика</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Всего потрачено</span>
              <span className="font-medium">
                {ledger.filter((e) => e.event === "CONSUMED").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Возвращено</span>
              <span className="font-medium">{returned.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Восстановлено по истечении срока</span>
              <span className="font-medium">{regenerated.length}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
