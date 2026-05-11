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
import { DialogHotkeyKbd } from "@/components/ui/kbd";
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
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle
              className="text-destructive size-5 shrink-0"
              aria-hidden
              stroke={1.75}
            />
            Опасная зона
          </CardTitle>
          <CardDescription className="flex flex-col gap-3">
            <p className="text-foreground/90 font-medium">Удаление аккаунта безвозвратно.</p>
            <div className="flex flex-col gap-1.5">
              <p>Будет удалено:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>профиль и связанные данные;</li>
                <li>ваши рефералки;</li>
                <li>заявки — в том числе заявки других пользователей на ваши рефералки;</li>
                <li>сохранённые пресеты поиска в каталоге;</li>
                <li>подписка и прочие данные в сервисе.</li>
              </ul>
            </div>
            <p>
              Неиспользованные оплаченные токены запроса и удерживаемое эскроу возвращаются по
              правилам платежей, если применимо.
            </p>
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
            Удалить аккаунт
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={!del.isPending} actionHotkeys>
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
              <DialogHotkeyKbd className="ml-1">Esc</DialogHotkeyKbd>
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={del.isPending}
              data-dialog-hotkey="confirm"
              onClick={() => del.mutate()}
            >
              <IconTrash className="size-4 shrink-0" aria-hidden />
              {del.isPending ? "Удаление…" : "Удалить навсегда"}
              <DialogHotkeyKbd className="ml-1">⏎</DialogHotkeyKbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
