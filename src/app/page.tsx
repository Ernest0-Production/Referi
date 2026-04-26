import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between border-b border-gray-100 px-6 py-4">
        <span className="text-lg font-bold text-gray-900">Referi</span>
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
        >
          Войти
        </Link>
      </nav>

      <section className="mx-auto max-w-4xl space-y-6 px-6 py-24 text-center">
        <h1 className="text-4xl leading-tight font-bold text-gray-900">
          Найди работу через рекомендацию <span className="text-blue-600">изнутри компании</span>
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-500">
          Разработчики рефералят других разработчиков в свою компанию. Безопасно, честно и
          мотивированно — с эскроу-защитой вознаграждения.
        </p>
        <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Начать поиск
          </Link>
          <Link
            href="/vacancies"
            className="rounded-xl border border-gray-200 px-6 py-3 font-medium text-gray-700 transition-colors hover:border-gray-300"
          >
            Смотреть вакансии
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
        {[
          {
            icon: "🔒",
            title: "Эскроу-защита",
            desc: "Деньги хранятся на сервисе до подтверждения трудоустройства",
          },
          {
            icon: "✅",
            title: "Проверенные рефералы",
            desc: "Только действующие сотрудники компаний, регистрация через GitHub",
          },
          {
            icon: "⚡",
            title: "Система сдержек",
            desc: "SLA-таймеры, ограничения и санкции защищают обе стороны",
          },
        ].map((card) => (
          <div key={card.title} className="space-y-3 rounded-2xl bg-gray-50 p-6">
            <div className="text-3xl">{card.icon}</div>
            <h3 className="font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
