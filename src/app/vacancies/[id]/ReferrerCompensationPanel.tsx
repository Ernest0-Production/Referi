"use client";

import { HandCoins, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { REFERRER_COMPENSATION_TOOLTIP } from "@/lib/vacancyTooltipMessages";

type ReferrerCompensationPanelProps = {
  amountText: string;
  className?: string;
};

export function ReferrerCompensationPanel({
  amountText,
  className,
}: ReferrerCompensationPanelProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-xl border border-red-600/25 bg-red-600/10 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 flex-1 items-start gap-1.5 text-sm text-red-800/90 dark:text-red-200/90">
          <HandCoins className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
          <span className="min-w-0 leading-snug break-words">Компенсация за рекомендацию</span>
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "text-red-800/70 hover:text-red-900 dark:text-red-200/70 dark:hover:text-red-100",
                "ring-offset-background -m-1 shrink-0 rounded-md p-1 outline-none",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              )}
              aria-label="Что такое компенсация за рекомендацию"
            >
              <Info className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="end"
            sideOffset={4}
            className="max-w-xs text-left leading-snug"
          >
            {REFERRER_COMPENSATION_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="font-semibold break-words text-red-950 dark:text-red-50">{amountText}</p>
    </div>
  );
}
