"use client";

import { signOut } from "next-auth/react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem
      onSelect={() => {
        void signOut({ callbackUrl: "/" });
      }}
    >
      Выйти
    </DropdownMenuItem>
  );
}
