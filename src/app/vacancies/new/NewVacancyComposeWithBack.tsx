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
import { ru } from "@/locales";

const NV = ru.vacancies.newVacancy;

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
        {NV.backToCatalog}
      </Button>
    ) : (
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href={CATALOG_HREF} onClick={() => clearVacancyCreateDraft()}>
          {NV.backToCatalog}
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
              <CardTitle>{NV.cardTitle}</CardTitle>
              {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <CreateVacancyForm onDirtyChange={setDirty} />
            </CardContent>
          </Card>
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent showCloseButton>
              <DialogHeader>
                <DialogTitle>{NV.discardTitle}</DialogTitle>
                <DialogDescription>{NV.discardDescription}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                  {NV.stay}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setConfirmOpen(false);
                    leave();
                  }}
                >
                  {NV.leave}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <Button variant="ghost" size="sm" className="w-fit" asChild>
            <Link href={CATALOG_HREF} onClick={() => clearVacancyCreateDraft()}>
              {NV.backToCatalog}
            </Link>
          </Button>
          <Card>
            <CardHeader>
                <CardTitle>{NV.cardTitle}</CardTitle>
              {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">{props.emptyState}</CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
