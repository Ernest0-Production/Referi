"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { startTransition, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ru } from "@/locales";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-hidden
        disabled
      >
        <Moon />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? ru.common.themeLightAria : ru.common.themeDarkAria}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
