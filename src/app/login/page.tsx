import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeAppPath } from "@/lib/safeAppPath";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { LoginButton } from "./LoginButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={null} />
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="flex flex-col gap-1 text-center">
            <CardTitle className="text-2xl">Referi</CardTitle>
            <CardDescription>Реферальная платформа для разработчиков</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-center text-sm">
              Войди через GitHub, чтобы продолжить
            </p>
            <LoginButton callbackUrl={callbackAfterAuth} />
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground w-full text-center text-xs">
              Для регистрации требуется GitHub аккаунт старше 1 года
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
