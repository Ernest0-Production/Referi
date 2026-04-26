"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback, Suspense } from "react";

function PayMockContent() {
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
        router.push("/login?registered=1");
        return;
      }
      router.push("/dashboard/applications");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Сеть");
    } finally {
      setLoading(false);
    }
  }, [paymentId, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Тестовая оплата (mock)</h1>
        <p className="text-sm text-gray-600">
          Нажмите кнопку, чтобы зачислить тестовый платёж и перейти дальше. Доступно при{" "}
          <code className="rounded bg-gray-100 px-1">FEATURE_REAL_PAYMENTS=false</code>.
        </p>
        {paymentId && (
          <p className="break-all font-mono text-xs text-gray-500">
            paymentId: {paymentId}
          </p>
        )}
        <button
          type="button"
          onClick={() => void complete()}
          disabled={loading || !paymentId}
          className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "…" : "Зачислить тестовый платёж"}
        </button>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}

export default function PayMockPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-500">Загрузка…</div>
      }
    >
      <PayMockContent />
    </Suspense>
  );
}
