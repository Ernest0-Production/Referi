"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ru } from "@/locales";

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
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={initiate.isPending}
        onClick={() => initiate.mutate({ applicationId })}
      >
        {initiate.isPending ? ru.payAuth.application.payPending : ru.payAuth.application.payCta}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="text-center text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
