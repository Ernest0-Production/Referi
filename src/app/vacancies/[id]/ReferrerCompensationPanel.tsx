"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { HandCoins, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { REFERRER_COMPENSATION_TOOLTIP } from "@/lib/vacancyTooltipMessages";

const REFERRER_COMPENSATION_LABEL_FULL = "Компенсация за рекомендацию";
const REFERRER_COMPENSATION_LABEL_SHORT = "Компенсация";

type ReferrerCompensationPanelProps = {
  amountText: string;
  className?: string;
};

export function ReferrerCompensationPanel({
  amountText,
  className,
}: ReferrerCompensationPanelProps) {
  const labelSlotRef = useRef<HTMLDivElement>(null);
  const labelMeasureRef = useRef<HTMLSpanElement>(null);
  const [useShortLabel, setUseShortLabel] = useState(false);

  useLayoutEffect(() => {
    const slot = labelSlotRef.current;
    const measure = labelMeasureRef.current;
    if (!slot || !measure) return;

    const update = () => {
      const available = slot.clientWidth;
      const needed = measure.scrollWidth;
      setUseShortLabel(needed > available);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(slot);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-xl border border-red-600/25 bg-red-600/10 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-1.5 text-sm text-red-800/90 dark:text-red-200/90">
          <HandCoins className="mt-0.5 size-4 shrink-0 opacity-90" aria-hidden />
          <div ref={labelSlotRef} className="relative min-w-0 flex-1">
            <span
              ref={labelMeasureRef}
              className="pointer-events-none absolute top-0 left-0 whitespace-nowrap opacity-0"
              aria-hidden
            >
              {REFERRER_COMPENSATION_LABEL_FULL}
            </span>
            <span
              className={cn(
                "min-w-0 leading-snug",
                useShortLabel ? "truncate whitespace-nowrap" : "whitespace-nowrap",
              )}
            >
              {useShortLabel ? REFERRER_COMPENSATION_LABEL_SHORT : REFERRER_COMPENSATION_LABEL_FULL}
            </span>
          </div>
        </div>
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
            className="max-w-xs items-start text-left leading-snug"
          >
            {REFERRER_COMPENSATION_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      </div>
      <p className="font-semibold break-words text-red-950 dark:text-red-50">{amountText}</p>
    </div>
  );
}
