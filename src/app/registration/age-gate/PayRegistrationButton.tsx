"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

interface Props {
  userId: string;
  feeDisplay: string;
}

export function PayRegistrationButton({ userId, feeDisplay }: Props) {
  const [error, setError] = useState<string | null>(null);

  const initiate = trpcReact.auth.initiateRegistrationPayment.useMutation({
    onSuccess(data) {
      window.location.href = data.confirmationUrl;
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <div className="space-y-2">
      <button
        onClick={() => initiate.mutate({ userId })}
        disabled={initiate.isPending}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
      >
        {initiate.isPending ? "Создание платежа…" : `Оплатить ${feeDisplay} и зарегистрироваться`}
      </button>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
