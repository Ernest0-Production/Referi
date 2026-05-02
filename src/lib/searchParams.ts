/** Next.js `searchParams`: значение ключа — `string | string[] | undefined`. */
export function firstQueryParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  const t = typeof s === "string" ? s.trim() : "";
  return t.length > 0 ? t : undefined;
}
