import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginButton } from "./LoginButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Referi</h1>
            <p className="text-gray-500 text-sm">
              Реферальная платформа для разработчиков
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Войдите через GitHub, чтобы продолжить
            </p>
            <LoginButton />
          </div>

          <p className="text-xs text-gray-400 text-center">
            Для регистрации требуется GitHub аккаунт старше 1 года
          </p>
        </div>
      </div>
    </main>
  );
}
