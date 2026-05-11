import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { formatApplicationCountLabel } from "@/lib/applicationCountLabel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      select: { displayName: true, staffRoles: true },
    }),
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
    prisma.referrerAttemptLedger.findMany({
      where: { referrerId: userId },
    }),
  ]);

  const isStaff =
    (user?.staffRoles.includes("MODERATOR") ?? false) ||
    (user?.staffRoles.includes("ADMIN") ?? false);

  const now = new Date();
  const activeConsumed = attemptData.filter(
    (e) => e.event === "CONSUMED" && e.regeneratesAt && e.regeneratesAt > now,
  );
  const availableAttempts = Math.max(
    0,
    BUSINESS_RULES.MAX_REFERRER_ATTEMPTS - activeConsumed.length,
  );

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">
            Добро пожаловать{user?.displayName ? `, ${user.displayName}` : ""}!
          </h1>
          {user && user.staffRoles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {user.staffRoles.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Button variant="outline" className="h-auto flex-col gap-1 py-4 font-normal" asChild>
            <Link href="/dashboard/applications">
              <span className="text-foreground text-lg font-bold">{activeApplications.length}</span>
              <span className="text-muted-foreground text-xs">Активных заявок</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-1 py-4 font-normal" asChild>
            <Link href="/dashboard/vacancy">
              <span className="text-foreground text-lg font-bold">
                {vacancyData ? vacancyData._count.applications : "—"}
              </span>
              <span className="text-muted-foreground text-xs">Запросов</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-1 py-4 font-normal" asChild>
            <Link href="/dashboard/attempts">
              <span className="text-primary text-lg font-bold">{availableAttempts}</span>
              <span className="text-muted-foreground text-xs">Попыток</span>
            </Link>
          </Button>
          {isStaff ? (
            <Button
              variant="outline"
              className="border-destructive/30 h-auto flex-col gap-1 py-4 font-normal"
              asChild
            >
              <Link href="/admin">
                <span className="text-destructive text-lg font-bold">Admin</span>
                <span className="text-muted-foreground text-xs">Панель</span>
              </Link>
            </Button>
          ) : null}
        </div>

        {activeApplications.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              Активные заявки
            </h2>
            {activeApplications.map((app) => {
              const deadline = nearestDeadline(app);
              const days = deadline ? daysLeft(deadline) : null;
              return (
                <Link key={app.id} href={`/dashboard/applications/${app.id}`}>
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-foreground font-medium">{app.vacancy.title}</p>
                        <p className="text-muted-foreground text-sm">{app.vacancy.companyName}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <Badge variant="secondary">{STATUS_LABELS[app.status] ?? app.status}</Badge>
                        {days !== null ? (
                          <p
                            className={`text-xs ${days <= 1 ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                          >
                            {days === 0 ? "Дедлайн сегодня" : `${days} дн. до дедлайна`}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
            <Button variant="link" className="h-auto self-start p-0" asChild>
              <Link href="/dashboard/applications">Все заявки →</Link>
            </Button>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Моя рефералка
          </h2>
          {vacancyData ? (
            <Link href="/dashboard/vacancy">
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-foreground font-medium">{vacancyData.title}</p>
                      <p className="text-muted-foreground text-sm">{vacancyData.companyName}</p>
                    </div>
                    <Badge variant={vacancyData.status === "ACTIVE" ? "default" : "secondary"}>
                      {vacancyData.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {formatApplicationCountLabel(vacancyData._count.applications)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                  <CardTitle className="text-base">Нет активной рефералки</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                <p className="text-muted-foreground text-center text-sm">
                    Создайте рефералку, чтобы получать запросы.
                </p>
                <Button asChild>
                    <Link href="/dashboard/vacancy">Создать рефералку</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
