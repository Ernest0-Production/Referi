import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { UpdateProfileForm } from "./UpdateProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();

  const staffLabel = me.staffRoles.length > 0 ? me.staffRoles.join(", ") : "—";

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Профиль</h1>
          <p className="text-sm text-muted-foreground">Управление вашими данными</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">GitHub:</span>
              <span className="text-muted-foreground">{me.githubLogin ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Email:</span>
              <span className="text-muted-foreground">{me.email ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Контакт:</span>
              <p className="text-muted-foreground">{me.contactInfo ?? "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Биография:</span>
              <p className="whitespace-pre-wrap text-muted-foreground">{me.bio ?? "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Персонал:</span>
              <span className="text-muted-foreground">{staffLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Доступных попыток:</span>
              <span className="text-muted-foreground">{me.availableAttempts}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Редактирование профиля</CardTitle>
            <CardDescription>Имя, контакты и био для откликов</CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateProfileForm
              currentName={me.displayName}
              currentContactInfo={me.contactInfo}
              currentBio={me.bio}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
