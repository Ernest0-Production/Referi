import Link from "next/link";
import type { Session } from "next-auth";
import { LayoutDashboard, Briefcase, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { userAvatarImageUrl } from "@/lib/userAvatarUrl";

function sessionDisplayLabel(user: NonNullable<Session["user"]>): string {
  if (user.githubLogin?.trim()) {
    return `@${user.githubLogin.trim()}`;
  }
  if (user.name?.trim()) {
    return user.name.trim();
  }
  if (user.email?.trim()) {
    return user.email.trim();
  }
  return "Аккаунт";
}

function initialsFromLabel(label: string): string {
  const t = label.replace(/^@/, "").trim();
  if (!t) return "?";
  const parts = t.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export async function PublicHeaderNav({ session }: { session: Session | null }) {
  const userId = session?.user?.id;
  let referrerVacancy: { id: string } | null = null;

  if (userId) {
    referrerVacancy = await prisma.vacancy.findFirst({
      where: { referrerId: userId, status: { in: ["ACTIVE", "FROZEN"] } },
      select: { id: true },
    });
  }

  const overviewHref = "/dashboard";
  const overviewLabel = "Обзор";
  const vacancyHref = "/dashboard/vacancy";
  const vacancyLabel = "Моя вакансия";
  const applicationsSeekerHref = "/dashboard/applications";
  const applicationsReferrerHref = "/dashboard/vacancy#candidates";
  const applicationsLabel = "Отклики";

  const primaryNav = referrerVacancy
    ? { href: vacancyHref, label: vacancyLabel, icon: Briefcase }
    : { href: overviewHref, label: overviewLabel, icon: LayoutDashboard };
  const secondaryNav = referrerVacancy
    ? { href: applicationsReferrerHref, label: applicationsLabel, icon: Send }
    : { href: applicationsSeekerHref, label: applicationsLabel, icon: Send };

  const PrimaryIcon = primaryNav.icon;
  const SecondaryIcon = secondaryNav.icon;

  const profileLabel = session?.user ? sessionDisplayLabel(session.user) : "";
  const avatarUrl = session?.user ? userAvatarImageUrl(session.user) : undefined;

  return (
    <nav className="border-border bg-card flex items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-6">
        <Link
          href="/"
          className="text-foreground flex shrink-0 items-center gap-2 font-bold tracking-tight"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--app-search-accent-bg)] text-[var(--app-search-accent-fg)]"
            aria-hidden
          >
            <span className="text-lg leading-none">R</span>
          </span>
          <span className="truncate text-lg">Referi</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="hidden h-9 gap-1.5 rounded-lg px-3 font-medium sm:inline-flex"
            >
              Вакансии
              <span className="text-muted-foreground" aria-hidden>
                ▾
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/">Каталог вакансий</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/vacancy">Разместить вакансию</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {userId ? (
          <div className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" className="text-muted-foreground h-9 gap-2 font-normal" asChild>
              <Link href={primaryNav.href}>
                <PrimaryIcon data-icon="inline-start" />
                {primaryNav.label}
              </Link>
            </Button>
            <Button variant="ghost" className="text-muted-foreground h-9 gap-2 font-normal" asChild>
              <Link href={secondaryNav.href}>
                <SecondaryIcon data-icon="inline-start" />
                {secondaryNav.label}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        {session?.user ? (
          <Button variant="ghost" size="icon" className="size-9 rounded-full" asChild>
            <Link
              href="/dashboard"
              title={sessionDisplayLabel(session.user)}
              aria-label="Перейти в дашборд"
            >
              <Avatar className="size-8">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileLabel} /> : null}
                <AvatarFallback className="text-xs font-medium">
                  {initialsFromLabel(profileLabel)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </Button>
        ) : (
          <Button asChild variant="default" size="sm" className="h-9">
            <Link href="/login">Войти</Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
