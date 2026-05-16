import { safeAppPath } from "@/lib/safeAppPath";

export const SIGN_IN_PARAM = "signIn" as const;
export const CALLBACK_PARAM = "callbackUrl" as const;

export function hrefSignInOverlay(
  returnDest: string,
  extra?: Record<string, string | undefined>,
): string {
  const dest = safeAppPath(returnDest, "/");
  const u = new URL(dest, "http://localhost");
  for (const [k, v] of Object.entries(extra ?? {})) {
    if (v != null && v !== "") {
      u.searchParams.set(k, v);
    }
  }
  u.searchParams.set(SIGN_IN_PARAM, "1");
  u.searchParams.set(CALLBACK_PARAM, dest);
  return `${u.pathname}${u.search}`;
}

export function resolvePostAuthCallbackUrl(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const raw = searchParams.get(CALLBACK_PARAM);
  if (raw) return safeAppPath(raw, pathname);
  const copy = new URLSearchParams(searchParams.toString());
  copy.delete(SIGN_IN_PARAM);
  copy.delete(CALLBACK_PARAM);
  const q = copy.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function stripSignInFromHref(pathname: string, searchParams: URLSearchParams): string {
  const copy = new URLSearchParams(searchParams.toString());
  copy.delete(SIGN_IN_PARAM);
  copy.delete(CALLBACK_PARAM);
  const q = copy.toString();
  return q ? `${pathname}?${q}` : pathname;
}
