"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogHotkeyKbd } from "@/components/ui/kbd";
import { useVacancyDashboardFormDirtyContext } from "./VacancyDashboardFormDirtyContext";

const DASHBOARD_HOME = "/";

export function DashboardVacancyBackButton({ label }: { label: string }) {
  const router = useRouter();
  const dirtyCtx = useVacancyDashboardFormDirtyContext();
  const formDirty = dirtyCtx?.dirty ?? false;
  const [confirmOpen, setConfirmOpen] = useState(false);

  function navigateBack() {
    if (typeof window === "undefined") return;
    try {
      if (document.referrer) {
        const refOrigin = new URL(document.referrer).origin;
        if (refOrigin !== window.location.origin) {
          router.push(DASHBOARD_HOME);
          return;
        }
      }
    } catch {
      router.push(DASHBOARD_HOME);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(DASHBOARD_HOME);
  }

  function handleClick() {
    if (formDirty) {
      setConfirmOpen(true);
      return;
    }
    navigateBack();
  }

  function confirmLeave() {
    setConfirmOpen(false);
    navigateBack();
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={handleClick}>
        ← {label}
      </Button>

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
