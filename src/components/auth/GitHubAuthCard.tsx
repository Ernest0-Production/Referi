import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginButton } from "@/app/login/LoginButton";

export function GitHubAuthCard({ callbackUrl }: { callbackUrl: string }) {
  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="flex flex-col gap-1 text-center">
        <CardTitle className="text-2xl">Referi</CardTitle>
        <CardDescription>Реферальная платформа для разработчиков</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-center text-sm">
          Войди через GitHub, чтобы продолжить
        </p>
        <LoginButton callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter>
        <p className="text-muted-foreground w-full text-center text-xs">
          Для регистрации требуется GitHub аккаунт старше 1 года
        </p>
      </CardFooter>
    </Card>
  );
}
