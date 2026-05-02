import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { ReactNode } from "react";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  });

  if (!user?.roles.includes("MODERATOR") && !user?.roles.includes("ADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center gap-6 border-b border-gray-100 bg-white px-6 py-4">
        <ServiceBrandLink />
        <span className="text-xs font-semibold tracking-wide text-red-600 uppercase">Admin</span>
        <a href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
          Споры
        </a>
        <a href="/admin/reports" className="text-sm text-gray-600 hover:text-gray-900">
          Жалобы
        </a>
      </nav>
      <div className="mx-auto max-w-5xl p-8">{children}</div>
    </div>
  );
}
