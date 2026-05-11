"use client";

import { useState } from "react";
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
          <CardTitle>Опасная зона</CardTitle>
          <CardDescription>
            Удаление аккаунта безвозвратно. Будут удалены профиль, рефералки, заявки (включая заявки
            других пользователей на ваши рефералки), пресеты поиска, подписка и прочие данные в
            сервисе. Неиспользованные оплаченные токены запроса и удерживаемое эскроу будут
            возвращены по правилам платежей, если применимо.
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
            Удалить аккаунт
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!del.isPending}>
          <DialogHeader>
            <DialogTitle>Удалить аккаунт навсегда?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Все ваши данные в Referi будут удалены.
            </DialogDescription>
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
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={del.isPending}
              onClick={() => del.mutate()}
            >
              {del.isPending ? "Удаление…" : "Удалить навсегда"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
