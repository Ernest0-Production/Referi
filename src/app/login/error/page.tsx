import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hrefSignInOverlay } from "@/lib/signInOverlayParams";

export default function LoginErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--app-page-surface)] p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>Не удалось войти</CardTitle>
          <CardDescription>Попробуй ещё раз или выбери другой способ входа.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Если проблема повторяется, проверь доступ к GitHub и настройки приложения OAuth.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={hrefSignInOverlay("/")}>Вернуться ко входу</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
