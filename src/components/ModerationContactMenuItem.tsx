"use client";

import { IconHeadset } from "@tabler/icons-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { publicEnv } from "@/publicEnv";

export function ModerationContactMenuItem() {
  const url = publicEnv.NEXT_PUBLIC_MODERATION_CONTACT_URL;
  if (!url) return null;
  return (
    <DropdownMenuItem asChild>
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <IconHeadset className="size-4 shrink-0" aria-hidden />
        Написать в поддержку
      </a>
    </DropdownMenuItem>
  );
}
