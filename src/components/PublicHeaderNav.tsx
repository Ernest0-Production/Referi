import Link from "next/link";
import type { Session } from "next-auth";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";

export function PublicHeaderNav({ session }: { session: Session | null }) {
  return (
    <nav className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
      <ServiceBrandLink className="text-lg" />
      <div className="flex min-w-0 items-center gap-3">
        {session?.user ? (
          <>
            {session.user.githubLogin ? (
              <span className="truncate text-sm text-gray-500" title="Логин GitHub">
                @{session.user.githubLogin}
              </span>
            ) : null}
            <Link href="/dashboard" className="shrink-0 text-sm text-gray-600 hover:text-blue-600">
              Дашборд
            </Link>
          </>
        ) : (
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Войти
          </Link>
        )}
      </div>
    </nav>
  );
}
