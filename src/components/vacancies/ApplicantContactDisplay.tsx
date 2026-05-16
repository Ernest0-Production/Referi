"use client";

import { useMemo, useState, type ReactNode } from "react";
import { IconBrandTelegram, IconLink, IconMail } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

type ParsedContact =
  | { kind: "plain"; text: string }
  | { kind: "telegram"; href: string; text: string }
  | { kind: "mailto"; href: string; text: string }
  | { kind: "url"; href: string; text: string };

function parseApplicantContact(raw: string): ParsedContact {
  const s = raw.trim();
  if (!s) {
    return { kind: "plain", text: s };
  }
  if (/^https?:\/\//i.test(s)) {
    return { kind: "url", href: s, text: s };
  }
  if (/^mailto:/i.test(s)) {
    return { kind: "mailto", href: s, text: s.replace(/^mailto:/i, "").trim() || s };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return { kind: "mailto", href: `mailto:${s}`, text: s };
  }
  if (s.startsWith("@")) {
    const rest = s.slice(1);
    if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(rest)) {
      return { kind: "telegram", href: `https://t.me/${rest}`, text: s };
    }
  }
  return { kind: "plain", text: s };
}

function faviconUrl(href: string): string | null {
  try {
    const host = new URL(href).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  } catch {
    return null;
  }
}

export function ApplicantContactDisplay({
  contactInfo,
  className,
}: {
  contactInfo: string;
  className?: string;
}) {
  const parsed = useMemo(() => parseApplicantContact(contactInfo), [contactInfo]);
  const [brokenFaviconHref, setBrokenFaviconHref] = useState<string | null>(null);

  if (parsed.kind === "plain") {
    return <p className={cn("text-foreground text-sm", className)}>{parsed.text}</p>;
  }

  const iconClass = "text-muted-foreground size-5 shrink-0";

  let leading: ReactNode = null;
  if (parsed.kind === "telegram") {
    leading = <IconBrandTelegram className={iconClass} aria-hidden />;
  } else if (parsed.kind === "mailto") {
    leading = <IconMail className={iconClass} aria-hidden />;
  } else if (parsed.kind === "url") {
    const src = faviconUrl(parsed.href);
    const faviconBroken = Boolean(src && brokenFaviconHref === parsed.href);
    if (!src || faviconBroken) {
      leading = <IconLink className={iconClass} aria-hidden />;
    } else {
      leading = (
        // eslint-disable-next-line @next/next/no-img-element -- внешний favicon, размер фиксирован
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 rounded-sm"
          onError={() => setBrokenFaviconHref(parsed.href)}
        />
      );
    }
  }

  return (
    <a
      href={parsed.href}
      className={cn(
        "text-foreground inline-flex max-w-full min-w-0 items-center gap-2 text-sm underline-offset-2 hover:underline",
        className,
      )}
      target={parsed.kind === "mailto" ? undefined : "_blank"}
      rel={parsed.kind === "mailto" ? undefined : "noopener noreferrer"}
    >
      {leading}
      <span className="min-w-0 truncate">{parsed.text}</span>
    </a>
  );
}
