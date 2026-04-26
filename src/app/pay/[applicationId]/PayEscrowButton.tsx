"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

export function PayEscrowButton({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);

  const initiate = trpcReact.payments.initiateEscrow.useMutation({
    onSuccess(data) {
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <div className="space-y-2">
      <button
        onClick={() => initiate.mutate({ applicationId })}
        disabled={initiate.isPending}
        className="w-full rounded-xl bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {initiate.isPending ? "Создание платежа…" : "Перейти к оплате"}
      </button>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
