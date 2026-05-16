"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GitHubAuthCard } from "@/components/auth/GitHubAuthCard";
import {
  SIGN_IN_PARAM,
  resolvePostAuthCallbackUrl,
  stripSignInFromHref,
} from "@/lib/signInOverlayParams";

export function SignInOverlayHost() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const signInOpen = searchParams.get(SIGN_IN_PARAM) === "1";

  const callbackAfterAuth = useMemo(
    () => resolvePostAuthCallbackUrl(pathname, searchParams),
    [pathname, searchParams],
  );

  const close = useCallback(() => {
    router.replace(stripSignInFromHref(pathname, searchParams));
  }, [pathname, router, searchParams]);

  return (
    <Dialog open={signInOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-md gap-0 border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-md"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Вход в Referi</DialogTitle>
        </DialogHeader>
        <GitHubAuthCard callbackUrl={callbackAfterAuth} />
      </DialogContent>
    </Dialog>
  );
}
