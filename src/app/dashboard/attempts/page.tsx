import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="flex-1">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Пул попыток</h1>
          <p className="text-muted-foreground text-sm">
            Каждая публикация рефералки расходует 1 попытку. Попытки восстанавливаются через 60
            дней.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <p className="text-primary text-3xl font-bold">{available}</p>
              <p className="text-muted-foreground text-xs">Доступно</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <p className="text-foreground text-3xl font-bold">{activeConsumed.length}</p>
              <p className="text-muted-foreground text-xs">Использовано</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center gap-1 py-4 text-center">
              <p className="text-foreground text-3xl font-bold">
                {BUSINESS_RULES.MAX_REFERRER_ATTEMPTS}
              </p>
              <p className="text-muted-foreground text-xs">Максимум</p>
            </CardContent>
          </Card>
        </div>

        {activeConsumed.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Использованные попытки
            </h2>
            {activeConsumed.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-foreground text-sm font-medium">
                      Потрачена{" "}
                      {new Date(e.createdAt).toLocaleDateString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {e.applicationId ? (
                      <p className="text-muted-foreground text-xs">Заявка: {e.applicationId}</p>
                    ) : null}
                  </div>
                  {e.regeneratesAt ? (
                    <div className="flex flex-col items-end gap-0.5 text-right">
                      <p className="text-muted-foreground text-xs">Восстановится через</p>
                      <p className="text-primary font-semibold">{daysUntil(e.regeneratesAt)} дн.</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(e.regeneratesAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </section>
        ) : null}

        {ledger.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              История ({ledger.length} записей)
            </h2>
            <Card>
              <CardContent className="divide-border flex flex-col divide-y p-0">
                {ledger.slice(0, 20).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-block size-2 shrink-0 rounded-full ${
                          e.event === "CONSUMED"
                            ? "bg-destructive"
                            : e.event === "RETURNED"
                              ? "bg-green-500"
                              : "bg-primary"
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {e.event === "CONSUMED"
                          ? "Потрачена"
                          : e.event === "RETURNED"
                            ? "Возвращена"
                            : "Восстановлена"}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {new Date(e.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                ))}
                {ledger.length > 20 ? (
                  <p className="text-muted-foreground px-4 py-2 text-xs">
                    + ещё {ledger.length - 20} записей
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </section>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Статистика</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span>Всего потрачено</span>
              <span className="text-foreground font-medium">
                {ledger.filter((e) => e.event === "CONSUMED").length}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Возвращено</span>
              <span className="text-foreground font-medium">{returned.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Восстановлено по истечении срока</span>
              <span className="text-foreground font-medium">{regenerated.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
