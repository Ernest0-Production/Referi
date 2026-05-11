"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";

export type AppNavBreadcrumbProps = {
  segments: NavBreadcrumbSegment[];
  className?: string;
  leaveGuard?: boolean;
  leaveDialogTitle?: string;
  leaveDialogDescription?: string;
  /** Вызывается перед фактическим переходом (после подтверждения или при клике без стража). */
  onBeforeNavigate?: () => void;
};

export function AppNavBreadcrumb({
  segments,
  className,
  leaveGuard = false,
  leaveDialogTitle = "Отменить изменения?",
  leaveDialogDescription = "Есть несохранённые правки. Выйти без сохранения?",
  onBeforeNavigate,
}: AppNavBreadcrumbProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  function runNavigate(href: string) {
    onBeforeNavigate?.();
    router.push(href);
  }

  function confirmLeave() {
    setConfirmOpen(false);
    const href = pendingHref;
    setPendingHref(null);
    if (href) {
      runNavigate(href);
    }
  }

  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "mb-1 flex min-h-8 shrink-0 items-center [&_[data-slot=breadcrumb-list]]:max-w-full",
          className,
        )}
      >
        <Breadcrumb>
          <BreadcrumbList>
            {segments.map((seg, i) => {
              const isLast = i === segments.length - 1;
              const hasHref = Boolean(seg.href) && !isLast;

              return (
                <React.Fragment key={`crumb-${i}-${seg.label}`}>
                  {i > 0 ? <BreadcrumbSeparator /> : null}
                  {hasHref ? (
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link
                          href={seg.href!}
                          className="max-w-[min(100%,20rem)] truncate"
                          onClick={(e) => {
                            if (leaveGuard) {
                              e.preventDefault();
                              setPendingHref(seg.href!);
                              setConfirmOpen(true);
                              return;
                            }
                            onBeforeNavigate?.();
                          }}
                        >
                          {seg.label}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ) : (
                    <BreadcrumbItem>
                      <BreadcrumbPage className="max-w-[min(100%,32rem)] truncate">
                        {seg.label}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  )}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {leaveGuard ? (
        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) {
              setPendingHref(null);
            }
          }}
        >
          <DialogContent showCloseButton>
            <DialogHeader>
              <DialogTitle>{leaveDialogTitle}</DialogTitle>
              <DialogDescription>{leaveDialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConfirmOpen(false);
                  setPendingHref(null);
                }}
              >
                Остаться
              </Button>
              <Button type="button" variant="destructive" onClick={confirmLeave}>
                Выйти
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
