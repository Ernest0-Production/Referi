import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";

export async function LegalDocShell({ title, children }: { title: string; children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={session} />
      <main className="flex flex-1 flex-col">
        <div className={PAGE_COLUMN_CLASS}>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="text-muted-foreground flex flex-col gap-6 text-sm leading-relaxed">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
