"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateVacancyForm, type EditVacancyFormVacancy } from "./CreateVacancyForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogHotkeyKbd } from "@/components/ui/kbd";

const DASHBOARD_VACANCY = "/dashboard/vacancy";

export function EditVacancyCard({
  vacancy,
  backNavLabel,
}: {
  vacancy: EditVacancyFormVacancy;
  backNavLabel: string;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function navigateEditBack() {
    if (typeof window === "undefined") return;
    try {
      if (document.referrer) {
        const refOrigin = new URL(document.referrer).origin;
        if (refOrigin !== window.location.origin) {
          router.push(DASHBOARD_VACANCY);
          return;
        }
      }
    } catch {
      router.push(DASHBOARD_VACANCY);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(DASHBOARD_VACANCY);
  }

  function handleBackClick() {
    if (!dirty) {
      navigateEditBack();
      return;
    }
    setConfirmOpen(true);
  }

  function confirmLeave() {
    setConfirmOpen(false);
    navigateEditBack();
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={handleBackClick}>
        ← {backNavLabel}
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Редактирование рефералки</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateVacancyForm
            key={vacancy.id}
            mode="edit"
            vacancy={vacancy}
            onDirtyChange={setDirty}
          />
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton actionHotkeys>
          <DialogHeader>
            <DialogTitle>Отменить изменения?</DialogTitle>
            <DialogDescription>Есть несохранённые правки. Выйти без сохранения?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Остаться
              <DialogHotkeyKbd className="ml-1">Esc</DialogHotkeyKbd>
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-dialog-hotkey="confirm"
              onClick={confirmLeave}
            >
              Выйти
              <DialogHotkeyKbd className="ml-1">⏎</DialogHotkeyKbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
