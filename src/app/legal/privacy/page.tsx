import type { Metadata } from "next";
import { env } from "@/env";
import { LegalDocShell } from "../LegalDocShell";
import { PrivacyDocument } from "../copy/PrivacyDocument";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Referi",
  description: "Политика обработки персональных данных сервиса Referi.",
};

export default function LegalPrivacyPage() {
  return (
    <LegalDocShell title="Политика конфиденциальности">
      <PrivacyDocument siteUrl={env.NEXT_PUBLIC_URL} />
    </LegalDocShell>
  );
}
