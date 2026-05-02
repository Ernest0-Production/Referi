import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { LoginButton } from "./LoginButton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (user) {
      redirect("/dashboard");
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
            <p className="text-center text-sm text-muted-foreground">Войдите через GitHub, чтобы продолжить</p>
            <LoginButton />
          </CardContent>
          <CardFooter>
            <p className="w-full text-center text-xs text-muted-foreground">
              Для регистрации требуется GitHub аккаунт старше 1 года
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
