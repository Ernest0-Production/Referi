import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { formatRubles } from "@/shared/utils/money";
import { PayRegistrationButton } from "./PayRegistrationButton";

interface PageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function AgeGatePage({ searchParams }: PageProps) {
  const { uid } = await searchParams;
  const feeDisplay = formatRubles(BUSINESS_RULES.REGISTRATION_FEE_KOP);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto w-full max-w-lg p-8">
        <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="mb-4 text-4xl">🔒</div>
            <h1 className="text-xl font-bold text-gray-900">Аккаунт GitHub слишком новый</h1>
            <p className="text-sm text-gray-500">
              Для защиты от спама и фейков требуется, чтобы ваш GitHub аккаунт существовал минимум{" "}
              <strong>{BUSINESS_RULES.GITHUB_ACCOUNT_MIN_AGE_DAYS} дней</strong>.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">Альтернатива: платная регистрация</p>
            <p className="text-sm text-amber-700">
              Вы можете зарегистрироваться сейчас, оплатив разовый сбор в размере{" "}
              <strong>{feeDisplay}</strong>. Этот сбор не возвращается.
            </p>
          </div>

          <div className="space-y-3">
            {uid ? (
              <PayRegistrationButton userId={uid} feeDisplay={feeDisplay} />
            ) : (
              <p className="text-center text-xs text-gray-400">
                Сессия не найдена. Вернитесь на страницу входа и попробуйте снова.
              </p>
            )}
          </div>

          <a
            href="/login"
            className="block text-center text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            ← Вернуться к входу
          </a>
        </div>
      </div>
    </main>
  );
}
