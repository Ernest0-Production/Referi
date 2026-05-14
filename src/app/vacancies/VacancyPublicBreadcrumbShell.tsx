"use client";

import type { NavBreadcrumbSegment } from "@/lib/navBreadcrumbTrail";
import { AppNavBreadcrumb } from "@/components/navigation/AppNavBreadcrumb";
import { BreadcrumbSeedPort } from "@/components/navigation/NavBreadcrumbStack";

export function VacancyPublicBreadcrumbShell({ seed }: { seed: NavBreadcrumbSegment[] }) {
  return (
    <>
      <BreadcrumbSeedPort seed={seed} />
      <AppNavBreadcrumb />
    </>
  );
}
