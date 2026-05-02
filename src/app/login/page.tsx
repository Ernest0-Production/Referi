import { redirect } from "next/navigation";
import { ServiceBrandLink } from "@/components/ServiceBrandLink";
import { auth } from "@/lib/auth";
import { LoginButton } from "./LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto w-full max-w-md p-8">
        <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">
              <ServiceBrandLink className="text-2xl text-gray-900" />
            </h1>
            <p className="text-sm text-gray-500">Реферальная платформа для разработчиков</p>
          </div>

          <div className="space-y-3">
            <p className="text-center text-sm text-gray-600">
              Войдите через GitHub, чтобы продолжить
            </p>
            <LoginButton />
          </div>

          <p className="text-center text-xs text-gray-400">
            Для регистрации требуется GitHub аккаунт старше 1 года
          </p>
        </div>
      </div>
    </main>
  );
}
