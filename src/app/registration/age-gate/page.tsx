import Link from "next/link";
import { BUSINESS_RULES } from "@/shared/constants/businessRules";
import { formatRubles } from "@/shared/utils/money";
import { PayRegistrationButton } from "./PayRegistrationButton";
import { PublicHeaderNav } from "@/components/PublicHeaderNav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  searchParams: Promise<{ uid?: string }>;
}

export default async function AgeGatePage({ searchParams }: PageProps) {
  const { uid } = await searchParams;
  const feeDisplay = formatRubles(BUSINESS_RULES.REGISTRATION_FEE_KOP);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--app-page-surface)]">
      <PublicHeaderNav session={null} />
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-sm">
          <CardHeader className="flex flex-col gap-2 text-center">
            <div className="text-4xl" aria-hidden>
              🔒
            </div>
            <CardTitle>Аккаунт GitHub слишком новый</CardTitle>
            <p className="text-muted-foreground text-sm">
              Для защиты от спама и фейков требуется, чтобы ваш GitHub аккаунт существовал минимум{" "}
              <strong className="text-foreground">
                {BUSINESS_RULES.GITHUB_ACCOUNT_MIN_AGE_DAYS} дней
              </strong>
              .
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Alert>
              <AlertTitle>Альтернатива: платная регистрация</AlertTitle>
              <AlertDescription>
                Вы можете зарегистрироваться сейчас, оплатив разовый сбор в размере{" "}
                <strong>{feeDisplay}</strong>. Этот сбор не возвращается.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              {uid ? (
                <PayRegistrationButton userId={uid} feeDisplay={feeDisplay} />
              ) : (
                <p className="text-muted-foreground text-center text-xs">
                  Сессия не найдена. Вернитесь на страницу входа и попробуйте снова.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="link" asChild>
              <Link href="/login">← Вернуться к входу</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
