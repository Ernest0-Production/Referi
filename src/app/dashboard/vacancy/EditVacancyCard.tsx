"use client";

import Link from "next/link";
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

export function EditVacancyCard({ vacancy }: { vacancy: EditVacancyFormVacancy }) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleCancelClick() {
    if (!dirty) {
      router.push("/dashboard/vacancy");
      return;
    }
    setConfirmOpen(true);
  }

  function confirmLeave() {
    setConfirmOpen(false);
    router.push("/dashboard/vacancy");
  }

  return (
    <>
      {dirty ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={handleCancelClick}
        >
          ← Просмотр
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link href="/dashboard/vacancy">← Просмотр</Link>
        </Button>
      )}
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
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Отменить изменения?</DialogTitle>
            <DialogDescription>Есть несохранённые правки. Выйти без сохранения?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Остаться
            </Button>
            <Button type="button" variant="destructive" onClick={confirmLeave}>
              Выйти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
