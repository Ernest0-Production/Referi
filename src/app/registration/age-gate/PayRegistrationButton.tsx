"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={initiate.isPending}
        onClick={() => initiate.mutate({ userId })}
      >
        {initiate.isPending ? "Создание платежа…" : `Оплатить ${feeDisplay} и зарегистрироваться`}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="text-center text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
