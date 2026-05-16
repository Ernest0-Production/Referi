"use client";

import Link from "next/link";
import { useMemo, type ComponentProps } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

type LinkProps = Omit<ComponentProps<typeof Link>, "href">;

export function SignInNavLink({
  callbackUrl,
  children,
  ...rest
}: LinkProps & { callbackUrl?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const currentSearch = useSearchParams();

  const href = useMemo(() => {
    if (callbackUrl) {
      return hrefSignInOverlay(callbackUrl);
    }
    const copy = new URLSearchParams(currentSearch.toString());
    copy.delete("signIn");
    copy.delete("callbackUrl");
    const q = copy.toString();
    const dest = q ? `${pathname}?${q}` : pathname;
    return hrefSignInOverlay(dest);
  }, [callbackUrl, pathname, currentSearch]);

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
