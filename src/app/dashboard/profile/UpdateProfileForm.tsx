"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  currentName: string;
  currentContactInfo?: string | null;
  currentBio?: string | null;
}

export function UpdateProfileForm({ currentName, currentContactInfo, currentBio }: Props) {
  const [name, setName] = useState(currentName);
  const [contactInfo, setContactInfo] = useState(currentContactInfo ?? "");
  const [bio, setBio] = useState(currentBio ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = trpcReact.auth.updateProfile.useMutation({
    onSuccess() {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError(err) {
      setError(err.message);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        update.mutate({
          displayName: name,
          contactInfo: contactInfo || undefined,
          bio: bio || undefined,
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="profile-name">Имя / псевдоним</FieldLabel>
          <Input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={100}
            placeholder="Отображаемое имя"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-contact">Контактная информация (мессенджер, email, ссылка)</FieldLabel>
          <Input
            id="profile-contact"
            type="text"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            maxLength={500}
            placeholder="@username / email / ссылка"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="profile-bio">Краткая биография</FieldLabel>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Кратко о вашем опыте"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={update.isPending || name.trim().length < 2}>
            {update.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
          {saved ? (
            <p className="text-xs text-muted-foreground">Сохранено</p>
          ) : null}
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}
