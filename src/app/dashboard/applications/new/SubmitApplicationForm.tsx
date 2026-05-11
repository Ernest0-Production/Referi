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
import { ru } from "@/locales";

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
  const F = ru.applications.form;
  const E = F.errors;
  const c = ru.common;
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
        setError(E.activeLimit);
      } else if (msg === "DUPLICATE_APPLICATION") {
        setError(E.duplicate);
      } else if (msg === "CANNOT_APPLY_TO_OWN_VACANCY") {
        setError(E.ownVacancy);
      } else if (msg === "VACANCY_NOT_ACTIVE") {
        setError(E.vacancyInactive);
      } else if (msg.startsWith("PAID_TOKEN_")) {
        setError(E.paidToken);
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
      setContactError(F.contactMin);
      return;
    }
    if (contact.length > 500) {
      setContactError(F.contactMax);
      return;
    }

    const bio = form.bio.trim();
    if (bio.length < 10) {
      setBioError(F.bioMin(bio.length));
      return;
    }
    if (bio.length > 1000) {
      setBioError(F.bioMax);
      return;
    }

    if (form.coverLetter.length > 300) {
      setCoverError(F.coverMax);
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
          <FieldLabel htmlFor="app-contact">{F.contactLabel}</FieldLabel>
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
            placeholder={F.contactPlaceholder}
          />
          <FieldDescription
            id="app-contact-desc"
            className={contactError ? "text-destructive" : undefined}
          >
            {contactError ?? F.contactHint}
          </FieldDescription>
        </Field>

        <Field data-invalid={bioError ? "true" : undefined}>
          <FieldLabel htmlFor="app-bio">{F.bioLabel}</FieldLabel>
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
            placeholder={F.bioPlaceholder}
          />
          <FieldDescription id="app-bio-desc" className={bioError ? "text-destructive" : undefined}>
            {bioError ?? F.bioHint}
          </FieldDescription>
        </Field>

        <Field data-invalid={coverError ? "true" : undefined}>
          <FieldLabel htmlFor="app-cover">{F.coverLabel}</FieldLabel>
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
            placeholder={F.coverPlaceholder}
          />
          <FieldDescription
            id="app-cover-desc"
            className={coverError ? "text-destructive" : undefined}
          >
            {coverError ?? F.coverHint}
          </FieldDescription>
        </Field>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{F.tokenCardTitle}</CardTitle>
            <CardDescription>{F.tokenCardDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tokenId ? (
              <p className="text-muted-foreground text-xs">{F.tokenActive}</p>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={buyToken.isPending}
                onClick={() => buyToken.mutate({ vacancyId })}
              >
                {buyToken.isPending ? F.buyTokenPending : F.buyToken}
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
          {submit.isPending ? F.submitPending : F.submit}
        </Button>
      </FieldGroup>
    </form>
  );
}
