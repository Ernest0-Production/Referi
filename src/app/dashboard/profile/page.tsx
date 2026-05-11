import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/trpc/server";
import { UpdateProfileForm } from "./UpdateProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ru } from "@/locales";

const P = ru.dashboard.profile;
const C = ru.common;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await trpc.auth.me();

  const staffLabel = me.staffRoles.length > 0 ? me.staffRoles.join(", ") : C.dash;

  return (
    <main className="flex-1">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6 md:p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">{P.title}</h1>
          <p className="text-muted-foreground text-sm">{P.subtitle}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{P.mainInfo}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{P.github}</span>
              <span className="text-muted-foreground">{me.githubLogin ?? C.dash}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{P.email}</span>
              <span className="text-muted-foreground">{me.email ?? C.dash}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground font-medium">{P.contact}</span>
              <p className="text-muted-foreground">{me.contactInfo ?? C.dash}</p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-foreground font-medium">{P.bio}</span>
              <p className="text-muted-foreground whitespace-pre-wrap">{me.bio ?? C.dash}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{P.staff}</span>
              <span className="text-muted-foreground">{staffLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{P.attempts}</span>
              <span className="text-muted-foreground">{me.availableAttempts}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{P.editTitle}</CardTitle>
            <CardDescription>{P.editDescription}</CardDescription>
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
