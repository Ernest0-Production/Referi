import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { DashboardHeaderNav } from "@/components/DashboardHeaderNav";
import { AccountDefaultBreadcrumbSeed } from "@/components/navigation/NavBreadcrumbStack";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
        <PublicHeaderNav session={null} />
        <main className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-sm">
          Войдите через GitHub, чтобы открыть этот раздел.
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <DashboardHeaderNav session={session} />
      <AccountDefaultBreadcrumbSeed />
      {children}
    </div>
  );
}
