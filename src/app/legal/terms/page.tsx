import type { Metadata } from "next";
import { env } from "@/env";
import { LegalDocShell } from "../LegalDocShell";
import { TermsDocument } from "../copy/TermsDocument";

export const metadata: Metadata = {
  title: "Пользовательские условия — Referi",
  description: "Пользовательское соглашение сервиса Referi.",
};

export default function LegalTermsPage() {
  return (
    <LegalDocShell title="Пользовательские условия">
      <TermsDocument siteUrl={env.NEXT_PUBLIC_URL} />
    </LegalDocShell>
  );
}
