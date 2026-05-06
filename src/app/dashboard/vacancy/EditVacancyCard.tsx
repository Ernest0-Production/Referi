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
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <CardTitle>Редактирование вакансии</CardTitle>
        <Button type="button" variant="destructive" size="sm" onClick={handleCancelClick}>
          Отмена
        </Button>
      </CardHeader>
      <CardContent>
        <CreateVacancyForm
          key={vacancy.id}
          mode="edit"
          vacancy={vacancy}
          onDirtyChange={setDirty}
        />
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Отменить изменения?</DialogTitle>
            <DialogDescription>Есть несохранённые правки. Выйти без сохранения?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Продолжить редактирование
            </Button>
            <Button type="button" variant="destructive" onClick={confirmLeave}>
              Выйти без сохранения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
