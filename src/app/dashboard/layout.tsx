import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardHeaderNav } from "@/components/DashboardHeaderNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <DashboardHeaderNav session={session} />
      {children}
    </div>
  );
}
