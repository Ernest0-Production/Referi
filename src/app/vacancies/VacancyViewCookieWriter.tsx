"use client";

import { useEffect } from "react";
import {
  VACANCY_VIEWED_COOKIE,
  VACANCY_VIEWED_MAX,
  parseVacancyViewedCookie,
} from "@/lib/vacancyViewedCookie";

function buildCookieValue(ids: string[]): string {
  const json = JSON.stringify(ids);
  const maxLen = 3800;
  if (json.length <= maxLen) return json;
  let n = ids.length;
  while (n > 0) {
    const trimmed = ids.slice(-n);
    const j = JSON.stringify(trimmed);
    if (j.length <= maxLen) return j;
    n -= 1;
  }
  return "[]";
}

export function VacancyViewCookieWriter({ vacancyId }: { vacancyId: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const raw = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${VACANCY_VIEWED_COOKIE}=`))
      ?.slice(VACANCY_VIEWED_COOKIE.length + 1);
    const decoded = raw ? decodeURIComponent(raw) : undefined;
    const existing = parseVacancyViewedCookie(decoded);
    const without = existing.filter((id) => id !== vacancyId);
    const next = [vacancyId, ...without].slice(0, VACANCY_VIEWED_MAX);
    const value = encodeURIComponent(buildCookieValue(next));
    const secure = typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = `${VACANCY_VIEWED_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
  }, [vacancyId]);

  return null;
}
