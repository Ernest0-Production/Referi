"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PayMockContent() {
  const search = useSearchParams();
  const router = useRouter();
  const paymentId = search.get("paymentId") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const complete = useCallback(async () => {
    if (!paymentId) {
      setError("Нет paymentId в ссылке");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pay/mock-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; type?: string };
      if (!res.ok) {
        setError(data.error ?? `Ошибка ${res.status}`);
        return;
      }
      if (data.type === "registration") {
        router.push(hrefSignInOverlay("/", { registered: "1" }));
        return;
      }
      router.push("/applications");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сеть");
    } finally {
      setLoading(false);
    }
  }, [paymentId, router]);

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader>
        <CardTitle>Тестовая оплата (mock)</CardTitle>
        <CardDescription>
          Нажми кнопку, чтобы зачислить тестовый платёж и перейти дальше. Доступно при{" "}
          <code className="bg-muted rounded px-1 font-mono text-xs">
            FEATURE_REAL_PAYMENTS=false
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {paymentId ? (
          <p className="text-muted-foreground font-mono text-xs break-all">
            paymentId: {paymentId}
          </p>
        ) : null}
        <Button type="button" disabled={loading || !paymentId} onClick={() => void complete()}>
          {loading ? "…" : "Зачислить тестовый платёж"}
        </Button>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
