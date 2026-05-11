"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  vacancyId: string;
  paidTokenId?: string;
  defaultContactInfo?: string;
  defaultBio?: string;
}

export function SubmitApplicationForm({
  vacancyId,
  paidTokenId,
  defaultContactInfo,
  defaultBio,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    contactInfo: defaultContactInfo ?? "",
    bio: defaultBio ?? "",
    coverLetter: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | undefined>(paidTokenId);

  const submit = trpcReact.applications.submit.useMutation({
    onSuccess() {
      router.push("/dashboard/applications");
    },
    onError(err) {
      const msg = err.message;
      if (msg === "ACTIVE_APPLICATION_LIMIT_REACHED") {
        setError(
          "Достигнут лимит активных откликов. Купите дополнительный токен или дождитесь завершения заявки.",
        );
      } else if (msg === "DUPLICATE_APPLICATION") {
        setError("Вы уже откликались на эту рефералку.");
      } else if (msg === "CANNOT_APPLY_TO_OWN_VACANCY") {
        setError("Нельзя откликаться на собственную рефералку.");
      } else if (msg === "VACANCY_NOT_ACTIVE") {
        setError("Рефералка больше не активна.");
      } else if (msg.startsWith("PAID_TOKEN_")) {
        setError("Токен отклика недействителен. Купите новый токен для этой рефералки.");
      } else {
        setError(err.message);
      }
    },
  });

  const buyToken = trpcReact.payments.initiatePaidApplicationToken.useMutation({
    onSuccess(data) {
      setTokenId(data.tokenId);
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setContactError(null);
    setBioError(null);
    setCoverError(null);

    const contact = form.contactInfo.trim();
    if (contact.length < 1) {
      setContactError("Укажите контакт (минимум 1 символ).");
      return;
    }
    if (contact.length > 500) {
      setContactError("Не больше 500 символов.");
      return;
    }

    const bio = form.bio.trim();
    if (bio.length < 10) {
      setBioError(`Минимум 10 символов. Сейчас: ${bio.length}.`);
      return;
    }
    if (bio.length > 1000) {
      setBioError("Не больше 1000 символов.");
      return;
    }

    if (form.coverLetter.length > 300) {
      setCoverError("Не больше 300 символов.");
      return;
    }

    submit.mutate({
      vacancyId,
      contactInfo: contact,
      bio,
      coverLetter: form.coverLetter.trim() || undefined,
      paidTokenId: tokenId,
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={contactError ? "true" : undefined}>
          <FieldLabel htmlFor="app-contact">Контактная информация *</FieldLabel>
          <Input
            id="app-contact"
            maxLength={500}
            value={form.contactInfo}
            aria-invalid={contactError ? true : undefined}
            aria-describedby="app-contact-desc"
            onChange={(e) => {
              setContactError(null);
              setForm((f) => ({ ...f, contactInfo: e.target.value }));
            }}
            placeholder="мессенджер, email или ссылка"
          />
          <FieldDescription
            id="app-contact-desc"
            className={contactError ? "text-destructive" : undefined}
          >
            {contactError ?? "Обязательное поле. До 500 символов."}
          </FieldDescription>
        </Field>

        <Field data-invalid={bioError ? "true" : undefined}>
          <FieldLabel htmlFor="app-bio">О себе *</FieldLabel>
          <Textarea
            id="app-bio"
            rows={5}
            maxLength={1000}
            value={form.bio}
            aria-invalid={bioError ? true : undefined}
            aria-describedby="app-bio-desc"
            onChange={(e) => {
              setBioError(null);
              setForm((f) => ({ ...f, bio: e.target.value }));
            }}
            placeholder="Опыт, стек, достижения"
          />
          <FieldDescription id="app-bio-desc" className={bioError ? "text-destructive" : undefined}>
            {bioError ?? "Минимум 10 символов, не более 1000."}
          </FieldDescription>
        </Field>

        <Field data-invalid={coverError ? "true" : undefined}>
          <FieldLabel htmlFor="app-cover">Сопроводительное письмо (необязательно)</FieldLabel>
          <Textarea
            id="app-cover"
            maxLength={300}
            rows={3}
            value={form.coverLetter}
            aria-invalid={coverError ? true : undefined}
            aria-describedby="app-cover-desc"
            onChange={(e) => {
              setCoverError(null);
              setForm((f) => ({ ...f, coverLetter: e.target.value }));
            }}
            placeholder="Почему именно эта рефералка?"
          />
          <FieldDescription
            id="app-cover-desc"
            className={coverError ? "text-destructive" : undefined}
          >
            {coverError ?? "Необязательно, не более 300 символов."}
          </FieldDescription>
        </Field>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Разовый токен отклика (199 ₽)</CardTitle>
            <CardDescription>
              Если бесплатный лимит активных откликов исчерпан, купите токен для этой рефералки.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tokenId ? (
              <p className="text-muted-foreground text-xs">Токен активирован для текущей заявки.</p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={buyToken.isPending}
                onClick={() => buyToken.mutate({ vacancyId })}
              >
                {buyToken.isPending ? "Переход к оплате…" : "Купить токен"}
              </Button>
            )}
          </CardContent>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={submit.isPending} className="w-full">
          {submit.isPending ? "Отправка…" : "Отправить отклик"}
        </Button>
      </FieldGroup>
    </form>
  );
}
