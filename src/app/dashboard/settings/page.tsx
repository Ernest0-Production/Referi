import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { UpdateProfileForm } from "@/app/dashboard/profile/UpdateProfileForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const moderationContactUrl = env.NEXT_PUBLIC_MODERATION_CONTACT_URL || null;

  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        contactInfo: true,
        bio: true,
        staffRoles: true,
      },
    }),
    prisma.seekerSubscription.findUnique({
      where: { userId },
      select: { status: true, currentPeriodEnd: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Настройки аккаунта</h1>
          <p className="text-sm text-muted-foreground">Профиль, подписка и ссылки</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Профиль</CardTitle>
            <CardDescription>GitHub и редактируемые поля</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">GitHub аккаунт</p>
              <p className="text-sm text-foreground">{session.user.name ?? "—"}</p>
            </div>
            <UpdateProfileForm
              currentName={user.displayName ?? ""}
              currentContactInfo={user.contactInfo}
              currentBio={user.bio}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Подписка</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {subscription ? (
              <div className="flex flex-col gap-2">
                <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                  {subscription.status === "ACTIVE" ? "PRO" : subscription.status}
                </Badge>
                {subscription.currentPeriodEnd ? (
                  <p className="text-sm text-muted-foreground">
                    Действует до:{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">У вас нет активной подписки PRO.</p>
                <Button asChild>
                  <Link href="/subscribe">Оформить PRO подписку</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {moderationContactUrl ? (
          <Card>
            <CardHeader>
              <CardTitle>Связь с модерацией</CardTitle>
              <CardDescription>Вопросы и дополнения к жалобам — вне приложения</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="link" className="h-auto p-0" asChild>
                <a href={moderationContactUrl} target="_blank" rel="noopener noreferrer">
                  Открыть контакт модерации
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {user.staffRoles.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Персонал</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.staffRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Быстрые ссылки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Button variant="link" className="h-auto justify-start p-0" asChild>
                <Link href="/dashboard/attempts">Пул попыток реферала</Link>
              </Button>
              <Button variant="link" className="h-auto justify-start p-0" asChild>
                <Link href="/dashboard/vacancy">Моя вакансия</Link>
              </Button>
              <Button variant="link" className="h-auto justify-start p-0" asChild>
                <Link href="/dashboard/applications">Мои заявки</Link>
              </Button>
              <Button variant="link" className="h-auto justify-start p-0" asChild>
                <Link href="/">Все вакансии</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
