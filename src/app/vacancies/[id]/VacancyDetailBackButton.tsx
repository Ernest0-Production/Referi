"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const CATALOG_HOME = "/";

export function VacancyDetailBackButton({ label }: { label: string }) {
  const router = useRouter();

  function navigateBack() {
    if (typeof window === "undefined") return;
    try {
      if (document.referrer) {
        const refOrigin = new URL(document.referrer).origin;
        if (refOrigin !== window.location.origin) {
          router.push(CATALOG_HOME);
          return;
        }
      }
    } catch {
      router.push(CATALOG_HOME);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(CATALOG_HOME);
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={navigateBack}>
      ← {label}
    </Button>
  );
}
