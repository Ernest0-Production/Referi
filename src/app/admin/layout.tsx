import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";
import { AdminHeaderNav } from "@/components/AdminHeaderNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

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
