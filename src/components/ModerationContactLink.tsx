"use client";

import type { ReactNode } from "react";
import { publicEnv } from "@/publicEnv";

/**
 * Публичная ссылка для связи с модерацией (NEXT_PUBLIC_MODERATION_CONTACT_URL).
 */
export function ModerationContactLink({
  className = "text-sm font-medium text-blue-600 hover:underline",
  children = "Связаться с модерацией" as ReactNode,
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
