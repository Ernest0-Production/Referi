"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { IconTrash } from "@tabler/icons-react";
import { trpcReact } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ru } from "@/locales";

const V = ru.dashboard.vacancy;
const C = ru.common;

type VacancyOwnerActionsProps = {
  vacancyId: string;
  editHref?: string;
  /** Если задано — после успешного удаления выполняется `router.replace` */
  redirectAfterDelete?: string;
  className?: string;
};

export function VacancyOwnerActions({
  vacancyId,
  editHref = "/dashboard/vacancy?edit=1",
  redirectAfterDelete,
  className,
}: VacancyOwnerActionsProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const del = trpcReact.vacancies.delete.useMutation({
    onSuccess() {
      setConfirmOpen(false);
      setError(null);
      if (redirectAfterDelete !== undefined) {
        router.replace(redirectAfterDelete);
      } else {
        router.refresh();
      }
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <>
      <div
        data-slot="button-group"
        className={`flex w-full min-w-0 overflow-hidden rounded-md ${className ?? ""}`}
      >
        <Button
          variant="default"
          size="lg"
          className="min-w-0 flex-1 rounded-none rounded-l-md"
          asChild
        >
          <Link href={editHref}>{V.ownerEdit}</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="default"
              size="icon-lg"
              aria-label={V.ownerMoreAria}
              className="border-primary-foreground/20 rounded-none rounded-r-md border-l"
            >
              <ChevronDown className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setError(null);
                setConfirmOpen(true);
              }}
            >
              <IconTrash className="size-4" />
              {C.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{V.deleteVacancyTitle}</DialogTitle>
            <DialogDescription>{V.deleteVacancyDescription}</DialogDescription>
          </DialogHeader>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              {C.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={del.isPending}
              onClick={() => del.mutate({ id: vacancyId })}
            >
              <IconTrash className="size-4 shrink-0" aria-hidden />
              {del.isPending ? V.deletePending : C.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
