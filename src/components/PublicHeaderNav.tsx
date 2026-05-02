import Link from "next/link";
import type { Session } from "next-auth";
import { CircleUserRound } from "lucide-react";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";

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

export function PublicHeaderNav({ session }: { session: Session | null }) {
  return (
    <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
      <ServiceBrandLink className="text-lg" />
      <div className="flex min-w-0 items-center gap-3">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="group flex min-w-0 max-w-full items-center gap-2 rounded-md py-0.5 text-sm text-gray-600 transition-colors hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            title="Перейти в дашборд"
            aria-label="Перейти в дашборд"
          >
            <CircleUserRound
              className="size-5 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600"
              aria-hidden
            />
            <span className="truncate">{sessionDisplayLabel(session.user)}</span>
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Войти
          </Link>
        )}
      </div>
    </nav>
  );
}
