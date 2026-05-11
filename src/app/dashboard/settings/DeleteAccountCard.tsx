"use client";

import { useState } from "react";
import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";
import { signOut } from "next-auth/react";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ru } from "@/locales";

const D = ru.dashboard.deleteAccount;
const C = ru.common;

export function DeleteAccountCard({ allowDelete }: { allowDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = trpcReact.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      setOpen(false);
      await signOut({ callbackUrl: "/" });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (!allowDelete) {
    return null;
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle
              className="text-destructive size-5 shrink-0"
              aria-hidden
              stroke={1.75}
            />
            {D.title}
          </CardTitle>
          <CardDescription className="flex flex-col gap-3">
            <p className="text-foreground/90 font-medium">{D.lead}</p>
            <div className="flex flex-col gap-1.5">
              <p>{D.willDeleteTitle}</p>
              <ul className="list-disc space-y-1 pl-5">
                {D.bullets.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <p>{D.refundNote}</p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            <IconTrash data-icon="inline-start" className="size-4 shrink-0" aria-hidden />
            {D.open}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!del.isPending}>
          <DialogHeader>
            <DialogTitle>{D.dialogTitle}</DialogTitle>
            <DialogDescription>{D.dialogDescription}</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={del.isPending}
              onClick={() => setOpen(false)}
            >
              {C.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={del.isPending}
              onClick={() => del.mutate()}
            >
              <IconTrash className="size-4 shrink-0" aria-hidden />
              {del.isPending ? D.confirmPending : D.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
