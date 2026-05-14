import Link from "next/link";
import type { Session } from "next-auth";
import { IconSettings } from "@tabler/icons-react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { userAvatarImageUrl } from "@/lib/userAvatarUrl";
import { Badge } from "@/components/ui/badge";
import { SignOutMenuItem } from "@/components/auth/SignOutMenuItem";
import { ModerationContactMenuItem } from "@/components/ModerationContactMenuItem";

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

export function AdminHeaderNav({ session }: { session: Session }) {
  const profileLabel = sessionDisplayLabel(session.user!);
  const avatarUrl = userAvatarImageUrl(session.user!);

  return (
    <nav className="border-border bg-card flex items-center justify-between gap-4 border-b px-4 py-3 md:px-6">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 md:gap-6">
        <Link
          href="/admin"
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
        <Badge variant="destructive" className="shrink-0 text-xs uppercase">
          Admin
        </Badge>
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" className="text-muted-foreground h-9 gap-2 font-normal" asChild>
            <Link href="/admin">
              <Shield data-icon="inline-start" />
              Споры
            </Link>
          </Button>
          <Button variant="ghost" className="text-muted-foreground h-9 gap-2 font-normal" asChild>
            <Link href="/admin/reports">Жалобы</Link>
          </Button>
          <Button variant="ghost" className="text-muted-foreground h-9 font-normal" asChild>
            <Link href="/">Кабинет</Link>
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <Button variant="outline" size="sm" className="md:hidden" asChild>
          <Link href="/admin/reports">Жалобы</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Меню">
              <Avatar className="size-8">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={profileLabel} /> : null}
                <AvatarFallback className="text-xs font-medium">
                  {initialsFromLabel(profileLabel)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <IconSettings className="size-4 shrink-0" aria-hidden />
                  Настройки
                </Link>
              </DropdownMenuItem>
              <ModerationContactMenuItem />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
