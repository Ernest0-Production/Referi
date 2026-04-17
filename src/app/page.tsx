import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-lg font-bold text-gray-900">Referi</span>
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Войти
        </Link>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-24 text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight">
          Найди работу через рекомендацию{" "}
          <span className="text-blue-600">изнутри компании</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
          Разработчики рефералят других разработчиков в свою компанию. Безопасно,
          честно и мотивированно — с эскроу-защитой вознаграждения.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Начать поиск
          </Link>
          <Link
            href="/vacancies"
            className="border border-gray-200 hover:border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl transition-colors"
          >
            Смотреть вакансии
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
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
          <div
            key={card.title}
            className="bg-gray-50 rounded-2xl p-6 space-y-3"
          >
            <div className="text-3xl">{card.icon}</div>
            <h3 className="font-semibold text-gray-900">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
