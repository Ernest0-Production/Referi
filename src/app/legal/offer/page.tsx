import type { Metadata } from "next";
import { env } from "@/env";
import { LegalDocShell } from "../LegalDocShell";
import { OfferDocument } from "../copy/OfferDocument";

export const metadata: Metadata = {
  title: "Публичная оферта — Referi",
  description: "Публичная оферта на оказание услуг по доступу к сервису Referi.",
};

export default function LegalOfferPage() {
  return (
    <LegalDocShell title="Публичная оферта">
      <OfferDocument siteUrl={env.NEXT_PUBLIC_URL} />
    </LegalDocShell>
  );
}
