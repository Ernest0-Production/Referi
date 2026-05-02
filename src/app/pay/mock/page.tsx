import { Suspense } from "react";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PayMockContent } from "./PayMockContent";
import { Card, CardContent } from "@/components/ui/card";

export default async function PayMockPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={null} />
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <Suspense
          fallback={
            <Card className="w-full max-w-md">
              <CardContent className="text-muted-foreground py-10 text-center">
                Загрузка…
              </CardContent>
            </Card>
          }
        >
          <PayMockContent />
        </Suspense>
      </main>
    </div>
  );
}
