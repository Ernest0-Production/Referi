import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeAppPath } from "@/lib/safeAppPath";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    registered?: string | string[];
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const rawCallback = Array.isArray(sp.callbackUrl) ? sp.callbackUrl[0] : sp.callbackUrl;
  const callbackAfterAuth = safeAppPath(rawCallback, "/");

  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (user) {
      redirect(callbackAfterAuth);
    }
  }

  const registeredRaw = Array.isArray(sp.registered) ? sp.registered[0] : sp.registered;
  const extra = registeredRaw === "1" ? { registered: "1" } : undefined;

  redirect(hrefSignInOverlay(callbackAfterAuth, extra));
}
