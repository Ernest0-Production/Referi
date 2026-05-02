"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpcReact } from "@/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SPECIALTIES = [
  "FRONTEND",
  "BACKEND",
  "FULLSTACK",
  "MOBILE",
  "DEVOPS",
  "QA",
  "DATA",
  "ML_AI",
  "SECURITY",
  "OTHER",
] as const;
const GRADES = ["JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"] as const;
const FORMATS = ["OFFICE", "HYBRID", "REMOTE"] as const;

export function CreateVacancyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    companyName: "",
    specialty: "BACKEND" as (typeof SPECIALTIES)[number],
    grade: "MIDDLE" as (typeof GRADES)[number],
    workFormat: "REMOTE" as (typeof FORMATS)[number],
    salaryFrom: "",
    salaryTo: "",
    description: "",
    rewardKopecks: "0",
  });

  const create = trpcReact.vacancies.create.useMutation({
    onSuccess() {
      router.refresh();
    },
    onError(err) {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate({
      title: form.title,
      companyName: form.companyName,
      specialty: form.specialty,
      grade: form.grade,
      workFormat: form.workFormat,
      salaryFrom: form.salaryFrom ? Number(form.salaryFrom) : undefined,
      salaryTo: form.salaryTo ? Number(form.salaryTo) : undefined,
      description: form.description,
      rewardKopecks: Number(form.rewardKopecks) || 0,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vac-title">Название вакансии *</FieldLabel>
            <Input
              id="vac-title"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Senior Backend Engineer"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vac-company">Компания *</FieldLabel>
            <Input
              id="vac-company"
              required
              minLength={2}
              maxLength={200}
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="ООО Пример"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel>Специальность</FieldLabel>
            <Select
              value={form.specialty}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, specialty: v as (typeof SPECIALTIES)[number] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Грейд</FieldLabel>
            <Select
              value={form.grade}
              onValueChange={(v) => setForm((f) => ({ ...f, grade: v as (typeof GRADES)[number] }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Формат</FieldLabel>
            <Select
              value={form.workFormat}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, workFormat: v as (typeof FORMATS)[number] }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="vac-sal-from">Зарплата от (₽)</FieldLabel>
            <Input
              id="vac-sal-from"
              type="number"
              min={0}
              value={form.salaryFrom}
              onChange={(e) => setForm((f) => ({ ...f, salaryFrom: e.target.value }))}
              placeholder="100000"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="vac-sal-to">Зарплата до (₽)</FieldLabel>
            <Input
              id="vac-sal-to"
              type="number"
              min={0}
              value={form.salaryTo}
              onChange={(e) => setForm((f) => ({ ...f, salaryTo: e.target.value }))}
              placeholder="200000"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="vac-reward">Бонус реферальщику (₽)</FieldLabel>
          <Input
            id="vac-reward"
            type="number"
            min={0}
            value={form.rewardKopecks}
            onChange={(e) => setForm((f) => ({ ...f, rewardKopecks: e.target.value }))}
            placeholder="0"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="vac-desc">Описание *</FieldLabel>
          <Textarea
            id="vac-desc"
            required
            minLength={10}
            maxLength={3000}
            rows={6}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Расскажите о вакансии, требованиях и условиях работы"
          />
        </Field>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Публикация…" : "Опубликовать вакансию"}
        </Button>
      </FieldGroup>
    </form>
  );
}
