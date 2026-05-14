import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { PayEscrowButton } from "./PayEscrowButton";
import { formatRubles } from "@/shared/utils/money";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    redirect(`/applications/${applicationId}`);
  }

  const escrow = await trpc.payments.escrowStatus({ applicationId });
  const reward = BigInt(application.vacancy.rewardKopecks);
  const chargeAmount = reward === 0n ? BUSINESS_RULES.PAID_APPLICATION_PRICE_KOP : reward;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={session} />
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-sm">
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Оплата заявки</CardTitle>
            <p className="text-muted-foreground text-sm">
              {application.vacancy.title} · {application.vacancy.companyName}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="border-border bg-muted/50 flex flex-col gap-2 rounded-xl border p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Сумма эскроу</span>
                <span className="text-foreground font-semibold">{formatRubles(chargeAmount)}</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Средства замораживаются до получения оффера. При отмене — полный возврат.
              </p>
            </div>

            {escrow?.amountKopecks ? (
              <Alert>
                <AlertTitle>Платёж уже создан</AlertTitle>
                <AlertDescription>Продолжи оплату через кнопку ниже.</AlertDescription>
              </Alert>
            ) : null}

            <PayEscrowButton applicationId={applicationId} />
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="link" asChild>
              <Link href={`/applications/${applicationId}`}>Вернуться к заявке</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
