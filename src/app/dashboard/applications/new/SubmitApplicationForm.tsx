"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
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
        setError("Вы уже откликались на эту вакансию.");
      } else if (msg === "CANNOT_APPLY_TO_OWN_VACANCY") {
        setError("Нельзя откликаться на собственную вакансию.");
      } else if (msg === "VACANCY_NOT_ACTIVE") {
        setError("Вакансия больше не активна.");
      } else if (msg.startsWith("PAID_TOKEN_")) {
        setError("Токен отклика недействителен. Купите новый токен для этой вакансии.");
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
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      formEl.reportValidity();
      return;
    }
    setError(null);
    setContactError(null);
    setBioError(null);

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
      setError("Сопроводительное письмо: не больше 300 символов.");
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
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <Field data-invalid={contactError ? "true" : undefined}>
          <FieldLabel htmlFor="app-contact">Контактная информация *</FieldLabel>
          <Input
            id="app-contact"
            required
            minLength={1}
            maxLength={500}
            value={form.contactInfo}
            aria-invalid={contactError ? true : undefined}
            onChange={(e) => {
              setContactError(null);
              setForm((f) => ({ ...f, contactInfo: e.target.value }));
            }}
            placeholder="мессенджер, email или ссылка"
          />
          {contactError ? <FieldError>{contactError}</FieldError> : null}
        </Field>

        <Field data-invalid={bioError ? "true" : undefined}>
          <FieldLabel htmlFor="app-bio">О себе *</FieldLabel>
          <Textarea
            id="app-bio"
            rows={5}
            required
            minLength={10}
            maxLength={1000}
            value={form.bio}
            aria-invalid={bioError ? true : undefined}
            onChange={(e) => {
              setBioError(null);
              setForm((f) => ({ ...f, bio: e.target.value }));
            }}
            placeholder="Опыт, стек, достижения"
          />
          {bioError ? <FieldError>{bioError}</FieldError> : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="app-cover">Сопроводительное письмо (необязательно)</FieldLabel>
          <Textarea
            id="app-cover"
            maxLength={300}
            rows={3}
            value={form.coverLetter}
            onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
            placeholder="Почему именно эта вакансия?"
          />
        </Field>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Разовый токен отклика (199 ₽)</CardTitle>
            <CardDescription>
              Если бесплатный лимит активных откликов исчерпан, купите токен для этой вакансии.
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
