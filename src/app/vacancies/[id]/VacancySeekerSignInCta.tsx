"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

export function VacancySeekerSignInCta({ vacancyId }: { vacancyId: string }) {
  return (
    <Button asChild size="lg" className="w-full sm:w-auto">
      <Link href={hrefSignInOverlay(`/vacancies/${vacancyId}`)}>
        Войти, чтобы попросить рефералку
      </Link>
    </Button>
  );
}
