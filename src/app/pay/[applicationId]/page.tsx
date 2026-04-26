import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PayEscrowButton } from "./PayEscrowButton";
import { formatRubles } from "@/shared/utils/money";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

export default async function PayPage({ params }: PageProps) {
  const { applicationId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=/pay/${applicationId}`);

  let application;
  try {
    application = await trpc.applications.getById({ applicationId });
  } catch {
    notFound();
  }

  if (application.status !== "AWAITING_PAYMENT") {
    redirect(`/dashboard/applications/${applicationId}`);
  }

  const escrow = await trpc.payments.escrowStatus({ applicationId });
  const reward = BigInt(application.vacancy.rewardKopecks);
  const chargeAmount = reward === 0n ? BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP : reward;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto w-full max-w-lg p-8">
        <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">Оплата заявки</h1>
            <p className="text-sm text-gray-500">
              {application.vacancy.title} · {application.vacancy.companyName}
            </p>
          </div>

          <div className="space-y-2 rounded-xl bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Сумма эскроу</span>
              <span className="font-semibold text-gray-900">{formatRubles(chargeAmount)}</span>
            </div>
            <p className="text-xs text-gray-400">
              Средства замораживаются до получения оффера. При отмене — полный возврат.
            </p>
          </div>

          {escrow?.amountKopecks && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                Платёж уже создан. Продолжите оплату через кнопку ниже.
              </p>
            </div>
          )}

          <PayEscrowButton applicationId={applicationId} />

          <a
            href={`/dashboard/applications/${applicationId}`}
            className="block text-center text-sm text-gray-400 hover:text-gray-600"
          >
            Вернуться к заявке
          </a>
        </div>
      </div>
    </main>
  );
}
