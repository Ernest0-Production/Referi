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
import { DialogHotkeyKbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";
import { useOptionalNavBreadcrumbStack } from "@/components/navigation/NavBreadcrumbStack";

export type AppNavBreadcrumbProps = {
  /** Статичные крошки без стека (например age-gate). */
  variant?: "stacked" | "static";
  segments?: NavBreadcrumbSegment[];
  className?: string;
  leaveGuard?: boolean;
  leaveDialogTitle?: string;
  leaveDialogDescription?: string;
  /** Вызывается перед фактическим переходом (после подтверждения или при клике без стража). */
  onBeforeNavigate?: () => void;
};

export function AppNavBreadcrumb({
  variant = "stacked",
  segments = [],
  className,
  leaveGuard = false,
  leaveDialogTitle = "Отменить изменения?",
  leaveDialogDescription = "Есть несохранённые правки. Выйти без сохранения?",
  onBeforeNavigate,
}: AppNavBreadcrumbProps) {
  const router = useRouter();
  const stack = useOptionalNavBreadcrumbStack();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const [pendingCrumbIndex, setPendingCrumbIndex] = React.useState<number | null>(null);

  const useStack = variant === "stacked" && stack != null;
  const effectiveSegments = useStack ? stack.trail : segments;

  function runNavigate(href: string, crumbIndex: number | null) {
    if (useStack && crumbIndex !== null) {
      stack.scheduleBreadcrumbTruncateAfterNavigation(crumbIndex);
    }
    onBeforeNavigate?.();
    router.push(href, { scroll: false });
  }

  function confirmLeave() {
    setConfirmOpen(false);
    const href = pendingHref;
    const idx = pendingCrumbIndex;
    setPendingHref(null);
    setPendingCrumbIndex(null);
    if (href != null) {
      runNavigate(href, idx);
    }
  }

  if (effectiveSegments.length === 0) {
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
            {effectiveSegments.map((seg, i) => {
              const isLast = i === effectiveSegments.length - 1;
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
                              setPendingCrumbIndex(useStack ? i : null);
                              setConfirmOpen(true);
                              return;
                            }
                            if (useStack) {
                              e.preventDefault();
                              stack.scheduleBreadcrumbTruncateAfterNavigation(i);
                              onBeforeNavigate?.();
                              router.push(seg.href!, { scroll: false });
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
              setPendingCrumbIndex(null);
            }
          }}
        >
          <DialogContent showCloseButton actionHotkeys>
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
                  setPendingCrumbIndex(null);
                }}
              >
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
      ) : null}
    </>
  );
}
