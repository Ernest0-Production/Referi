import { redirect } from "next/navigation";
import Link from "next/link";
import { IconCreditCard, IconHeadset, IconUser } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import { UpdateProfileForm } from "@/app/dashboard/profile/UpdateProfileForm";
import { DeleteAccountCard } from "@/app/dashboard/settings/DeleteAccountCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ru } from "@/locales";

const S = ru.dashboard.settings;
const C = ru.common;

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

  const githubLogin = session.user.githubLogin?.trim() ?? "";

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">{S.title}</h1>
          <p className="text-muted-foreground text-sm">{S.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden
                stroke={1.75}
              />
              {S.profileCard}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-xs">{S.githubAccount}</p>
              {githubLogin ? (
                <a
                  href={`https://github.com/${encodeURIComponent(githubLogin)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground w-fit text-sm underline-offset-2 hover:underline"
                >
                  {githubLogin}
                </a>
              ) : (
                <p className="text-foreground text-sm">{session.user.name ?? C.dash}</p>
              )}
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
            <CardTitle className="flex items-center gap-2">
              <IconCreditCard
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden
                stroke={1.75}
              />
              {S.subscription}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {subscription ? (
              <div className="flex flex-col gap-2">
                <Badge variant={subscription.status === "ACTIVE" ? "default" : "secondary"}>
                  {subscription.status === "ACTIVE" ? "PRO" : subscription.status}
                </Badge>
                {subscription.currentPeriodEnd ? (
                  <p className="text-muted-foreground text-sm">
                    {S.activeUntil}{" "}
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
                <p className="text-muted-foreground text-sm">{S.noPro}</p>
                <Button asChild>
                  <Link href="/subscribe">{S.subscribeCta}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {moderationContactUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconHeadset
                  className="text-muted-foreground size-5 shrink-0"
                  aria-hidden
                  stroke={1.75}
                />
                {S.moderation.title}
              </CardTitle>
              <CardDescription>{S.moderation.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <a href={moderationContactUrl} target="_blank" rel="noopener noreferrer">
                  {S.moderation.open}
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {user.staffRoles.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{S.staff}</CardTitle>
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

        <DeleteAccountCard allowDelete={user.staffRoles.length === 0} />
      </div>
    </main>
  );
}
