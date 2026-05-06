export function safeAppPath(candidate: string | undefined, fallback: string): string {
  if (candidate == null || typeof candidate !== "string") return fallback;
  const t = candidate.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return fallback;
  return t;
}
