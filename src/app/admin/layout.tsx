import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";
import { AdminHeaderNav } from "@/components/AdminHeaderNav";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
        <PublicHeaderNav session={null} />
        <main className="text-muted-foreground flex flex-1 items-center justify-center p-6 text-center text-sm">
          Войдите через GitHub, чтобы открыть админку.
        </main>
      </div>
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { staffRoles: true },
  });

  if (!user?.staffRoles.includes("MODERATOR") && !user?.staffRoles.includes("ADMIN")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <AdminHeaderNav session={session} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">{children}</div>
    </div>
  );
}
