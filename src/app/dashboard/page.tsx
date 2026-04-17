import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-gray-900">Referi</span>
        <span className="text-sm text-gray-500">
          {session.user.name ?? session.user.email}
        </span>
      </nav>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Добро пожаловать в Referi
        </h1>
        <p className="text-gray-500">
          Платформа находится в активной разработке. Функционал будет доступен
          в ближайших обновлениях.
        </p>
      </div>
    </main>
  );
}
