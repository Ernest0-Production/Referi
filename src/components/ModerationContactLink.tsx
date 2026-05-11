"use client";

import type { ReactNode } from "react";
import { publicEnv } from "@/publicEnv";
import { ru } from "@/locales";

/**
 * Public link for moderation contact (`NEXT_PUBLIC_MODERATION_CONTACT_URL`).
 */
export function ModerationContactLink({
  className = "text-sm font-medium text-blue-600 hover:underline",
  children = ru.payAuth.moderationLinkDefault as ReactNode,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const url = publicEnv.NEXT_PUBLIC_MODERATION_CONTACT_URL;
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
