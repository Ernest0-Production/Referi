"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);

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
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setNameError(null);
        setContactError(null);
        setBioError(null);

        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
          setNameError("Имя — минимум 2 символа.");
          return;
        }
        if (trimmedName.length > 100) {
          setNameError("Не более 100 символов.");
          return;
        }

        if (contactInfo.length > 500) {
          setContactError("Не более 500 символов.");
          return;
        }

        if (bio.length > 1000) {
          setBioError("Не более 1000 символов.");
          return;
        }

        update.mutate({
          displayName: trimmedName,
          contactInfo: contactInfo || undefined,
          bio: bio || undefined,
        });
      }}
    >
      <FieldGroup>
        <Field data-invalid={nameError ? "true" : undefined}>
          <FieldLabel htmlFor="profile-name">Как к тебе обращаться</FieldLabel>
          <Input
            id="profile-name"
            type="text"
            value={name}
            maxLength={100}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "profile-name-desc" : undefined}
            onChange={(e) => {
              setNameError(null);
              setName(e.target.value);
            }}
            placeholder="Отображаемое имя"
          />
          {nameError ? (
            <FieldDescription id="profile-name-desc" className="text-destructive">
              {nameError}
            </FieldDescription>
          ) : null}
        </Field>

        <Field data-invalid={contactError ? "true" : undefined}>
          <FieldLabel htmlFor="profile-contact">Контактная информация</FieldLabel>
          <Input
            id="profile-contact"
            type="text"
            value={contactInfo}
            maxLength={500}
            aria-invalid={contactError ? true : undefined}
            aria-describedby="profile-contact-desc"
            onChange={(e) => {
              setContactError(null);
              setContactInfo(e.target.value);
            }}
            placeholder="@username / email / ссылка"
          />
          <FieldDescription
            id="profile-contact-desc"
            className={contactError ? "text-destructive" : undefined}
          >
            {contactError ?? "Это нужно, чтобы реферальщик мог с тобой связаться."}
          </FieldDescription>
        </Field>

        <Field data-invalid={bioError ? "true" : undefined}>
          <FieldLabel htmlFor="profile-bio">О себе</FieldLabel>
          <Textarea
            id="profile-bio"
            value={bio}
            maxLength={1000}
            rows={8}
            aria-invalid={bioError ? true : undefined}
            aria-describedby={bioError ? "profile-bio-desc" : undefined}
            onChange={(e) => {
              setBioError(null);
              setBio(e.target.value);
            }}
            placeholder="Кратко о твоём опыте"
          />
          {bioError ? (
            <FieldDescription id="profile-bio-desc" className="text-destructive">
              {bioError}
            </FieldDescription>
          ) : null}
        </Field>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
          {saved ? <p className="text-muted-foreground text-xs">Сохранено</p> : null}
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
