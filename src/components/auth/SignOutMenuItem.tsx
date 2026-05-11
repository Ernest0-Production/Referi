"use client";

import { signOut } from "next-auth/react";
import { IconLogout } from "@tabler/icons-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ru } from "@/locales";

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem
      variant="destructive"
      className="gap-2"
      onSelect={() => {
        void signOut({ callbackUrl: "/" });
      }}
    >
      <IconLogout className="size-4 shrink-0" aria-hidden />
      {ru.common.signOut}
    </DropdownMenuItem>
  );
}
