"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function dialogTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable="true"]')) return true;
  const field = target.closest("input, textarea, select");
  if (!field) return false;
  if (field instanceof HTMLInputElement) {
    const t = field.type;
    if (
      t === "button" ||
      t === "submit" ||
      t === "reset" ||
      t === "checkbox" ||
      t === "radio" ||
      t === "file"
    ) {
      return false;
    }
    return true;
  }
  return field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement;
}

/** Поля вне футера — оставляем стандартный автофокус Radix (например форма с именем пресета). */
function dialogHasTextFieldOutsideFooter(container: HTMLElement): boolean {
  const footer = container.querySelector('[data-slot="dialog-footer"]');
  for (const el of container.querySelectorAll('input, textarea, [contenteditable="true"]')) {
    if (!(el instanceof HTMLElement)) continue;
    if (footer?.contains(el)) continue;
    if (el instanceof HTMLInputElement) {
      const t = el.type;
      if (
        t === "hidden" ||
        t === "button" ||
        t === "submit" ||
        t === "reset" ||
        t === "checkbox" ||
        t === "radio" ||
        t === "file"
      ) {
        continue;
      }
    }
    return true;
  }
  return false;
}

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  actionHotkeys = false,
  onKeyDown,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  actionHotkeys?: boolean;
}) {
  const handleOpenAutoFocus = (e: Event) => {
    onOpenAutoFocus?.(e);
    if (!actionHotkeys || e.defaultPrevented) return;
    const container = e.currentTarget as HTMLElement;
    if (dialogHasTextFieldOutsideFooter(container)) return;
    const primary = container.querySelector<HTMLButtonElement>(
      '[data-dialog-hotkey="confirm"]:not([disabled])',
    );
    if (!primary || primary.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    queueMicrotask(() => primary.focus());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (!actionHotkeys || e.defaultPrevented) return;
    if (e.key !== "Enter" || e.repeat) return;
    if (e.nativeEvent.isComposing) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (e.target instanceof HTMLButtonElement) return;
    if (dialogTypingTarget(e.target)) return;
    const root = e.currentTarget;
    const primary = root.querySelector<HTMLButtonElement>(
      '[data-dialog-hotkey="confirm"]:not([disabled])',
    );
    if (!primary || primary.getAttribute("aria-disabled") === "true") return;
    e.preventDefault();
    primary.click();
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 text-sm ring-1 duration-100 outline-none sm:max-w-sm",
          className,
        )}
        {...props}
        onKeyDown={actionHotkeys ? handleKeyDown : onKeyDown}
        onOpenAutoFocus={actionHotkeys ? handleOpenAutoFocus : onOpenAutoFocus}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button variant="ghost" className="absolute top-2 right-2" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
