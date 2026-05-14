import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { UpdateProfileForm } from "./UpdateProfileForm";
import { PAGE_COLUMN_CLASS } from "@/lib/pageContentShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();

  const staffLabel = me.staffRoles.length > 0 ? me.staffRoles.join(", ") : "—";

  return (
    <main className="flex-1">
      <div className={PAGE_COLUMN_CLASS}>
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">Профиль</h1>
          <p className="text-muted-foreground text-sm">Управление твоими данными</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">GitHub:</span>
              <span className="text-muted-foreground">{me.githubLogin ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">Email:</span>
              <span className="text-muted-foreground">{me.email ?? "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground font-medium">Контакт:</span>
              <p className="text-muted-foreground">{me.contactInfo ?? "—"}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground font-medium">Биография:</span>
              <p className="text-muted-foreground whitespace-pre-wrap">{me.bio ?? "—"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">Персонал:</span>
              <span className="text-muted-foreground">{staffLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">Доступных попыток:</span>
              <span className="text-muted-foreground">{me.availableAttempts}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Редактирование профиля</CardTitle>
            <CardDescription>Имя, контакты и био для запросов по рефералкам</CardDescription>
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
