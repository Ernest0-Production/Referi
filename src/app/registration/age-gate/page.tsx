import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { formatRubles } from "@/shared/utils/money";

export default function AgeGatePage() {
  const feeDisplay = formatRubles(BUSINESS_RULES.REGISTRATION_FEE_KOP);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl mb-4">🔒</div>
            <h1 className="text-xl font-bold text-gray-900">
              Аккаунт GitHub слишком новый
            </h1>
            <p className="text-gray-500 text-sm">
              Для защиты от спама и фейков требуется, чтобы ваш GitHub аккаунт
              существовал минимум{" "}
              <strong>{BUSINESS_RULES.GITHUB_ACCOUNT_MIN_AGE_DAYS} дней</strong>.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-amber-800">
              Альтернатива: платная регистрация
            </p>
            <p className="text-sm text-amber-700">
              Вы можете зарегистрироваться сейчас, оплатив разовый сбор в размере{" "}
              <strong>{feeDisplay}</strong>. Этот сбор не возвращается.
            </p>
          </div>

          <div className="space-y-3">
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
              disabled
            >
              Оплатить {feeDisplay} и зарегистрироваться
            </button>
            <p className="text-xs text-gray-400 text-center">
              Интеграция с платёжной системой будет добавлена в следующей версии
            </p>
          </div>

          <a
            href="/login"
            className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Вернуться к входу
          </a>
        </div>
      </div>
    </main>
  );
}
