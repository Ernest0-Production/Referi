import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/settings", "/profile", "/applications", "/attempts", "/admin"];

// Re-export auth as proxy — Auth.js v5 HOC checks the JWT cookie and
// populates req.auth without hitting the database.
export const proxy = auth(function proxy(
  req: NextRequest & { auth: { user?: { id?: string } } | null },
) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth?.user) {
    if (req.nextUrl.searchParams.get("signIn") === "1") {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.searchParams.set("signIn", "1");
    if (!url.searchParams.has("callbackUrl")) {
      url.searchParams.set("callbackUrl", `${pathname}${req.nextUrl.search}`);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except Next.js internals, static assets, auth API
    "/((?!_next/static|_next/image|api/auth|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
