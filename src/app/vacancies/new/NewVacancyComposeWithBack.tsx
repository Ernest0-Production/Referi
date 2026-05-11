"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateVacancyForm } from "@/app/dashboard/vacancy/CreateVacancyForm";
import { clearVacancyCreateDraft } from "@/lib/vacancyCreateDraftStorage";
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

const CATALOG_HREF = "/";

export type NewVacancyComposeWithBackProps = {
  title: string;
  subtitle?: string | null;
  cardDescription?: string | null;
} & ({ showForm: true } | { showForm: false; emptyState: ReactNode });

export function NewVacancyComposeWithBack(props: NewVacancyComposeWithBackProps) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { title, subtitle, cardDescription, showForm } = props;

  function handleBackClick() {
    setConfirmOpen(true);
  }

  function leave() {
    clearVacancyCreateDraft();
    router.push(CATALOG_HREF);
  }

  const backControl =
    showForm && dirty ? (
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={handleBackClick}>
        ← К рефералкам
      </Button>
    ) : (
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={CATALOG_HREF} onClick={() => clearVacancyCreateDraft()}>
          ← К рефералкам
        </Link>
      </Button>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-foreground text-2xl font-bold">{title}</h1>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
      </div>

      {showForm ? (
        <>
          {backControl}
          <Card>
            <CardHeader>
              <CardTitle>Новая рефералка</CardTitle>
              {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CreateVacancyForm onDirtyChange={setDirty} />
            </CardContent>
          </Card>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent showCloseButton actionHotkeys>
              <DialogHeader>
                <DialogTitle>Выйти без сохранения?</DialogTitle>
                <DialogDescription>
                  Есть несохранённые данные. Вернуться в каталог без публикации?
                </DialogDescription>
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
                  onClick={() => {
                    setConfirmOpen(false);
                    leave();
                  }}
                >
                  Выйти
                  <DialogHotkeyKbd className="ml-1">⏎</DialogHotkeyKbd>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href={CATALOG_HREF} onClick={() => clearVacancyCreateDraft()}>
              ← К рефералкам
            </Link>
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Новая рефералка</CardTitle>
              {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">{props.emptyState}</CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
