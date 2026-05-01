"use client";

import type { ReactNode } from "react";

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
  const url = process.env.NEXT_PUBLIC_MODERATION_CONTACT_URL?.trim();
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
