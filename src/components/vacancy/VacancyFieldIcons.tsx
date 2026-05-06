"use client";

import {
  IconBrandAndroid,
  IconBrandApple,
  IconBrain,
  IconBug,
  IconBuildingSkyscraper,
  IconCloudComputing,
  IconCurrencyDollar,
  IconCurrencyEuro,
  IconCurrencyRubel,
  IconDatabase,
  IconDots,
  IconHomeShare,
  IconLayout,
  IconServer,
  IconShield,
  IconStack2,
  IconTopologyStar3,
  IconWorld,
} from "@tabler/icons-react";
import { type VacancySalaryCurrency } from "@/lib/vacancySalaryCurrency";
import { cn } from "@/lib/utils";

export const SELECT_TRIGGER_ICON = "text-muted-foreground size-4 shrink-0 pointer-events-none";

export function SpecialtyIcon({ specialty, className }: { specialty: string; className?: string }) {
  const c = cn(SELECT_TRIGGER_ICON, className);
  switch (specialty) {
    case "FRONTEND":
      return <IconLayout className={c} aria-hidden />;
    case "BACKEND":
      return <IconServer className={c} aria-hidden />;
    case "FULLSTACK":
      return <IconStack2 className={c} aria-hidden />;
    case "IOS_MOBILE":
      return <IconBrandApple className={c} aria-hidden />;
    case "ANDROID_MOBILE":
      return <IconBrandAndroid className={c} aria-hidden />;
    case "DEVOPS":
      return <IconCloudComputing className={c} aria-hidden />;
    case "QA":
      return <IconBug className={c} aria-hidden />;
    case "DATA":
      return <IconDatabase className={c} aria-hidden />;
    case "ML_AI":
      return <IconBrain className={c} aria-hidden />;
    case "SECURITY":
      return <IconShield className={c} aria-hidden />;
    default:
      return <IconDots className={c} aria-hidden />;
  }
}

export function WorkFormatIcon({ format, className }: { format: string; className?: string }) {
  const c = cn(SELECT_TRIGGER_ICON, className);
  switch (format) {
    case "OFFICE":
      return <IconBuildingSkyscraper className={c} aria-hidden />;
    case "HYBRID":
      return <IconHomeShare className={c} aria-hidden />;
    case "REMOTE":
      return <IconWorld className={c} aria-hidden />;
    default:
      return <IconDots className={c} aria-hidden />;
  }
}

export function SalaryCurrencyIcon({
  code,
  className,
}: {
  code: VacancySalaryCurrency;
  className?: string;
}) {
  const c = cn(SELECT_TRIGGER_ICON, className);
  if (code === "RUB") return <IconCurrencyRubel className={c} aria-hidden />;
  if (code === "USD") return <IconCurrencyDollar className={c} aria-hidden />;
  return <IconCurrencyEuro className={c} aria-hidden />;
}

export function GradeIcon({ className }: { className?: string }) {
  return <IconTopologyStar3 className={cn(SELECT_TRIGGER_ICON, className)} aria-hidden />;
}
