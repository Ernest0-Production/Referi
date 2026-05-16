export function formatSeekerApplicationRecencyLabel(
  createdAt: Date | string,
  now: Date = new Date(),
): string {
  const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  const ms = now.getTime() - d.getTime();
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

  if (ms < 0) {
    return `Заявка от ${d.toLocaleDateString("ru-RU")}`;
  }

  const secondsTotal = Math.floor(ms / 1000);
  if (secondsTotal < 45) {
    return "Откликнулся только что";
  }

  const minutesTotal = Math.floor(secondsTotal / 60);
  if (minutesTotal < 60) {
    return `Откликнулся ${rtf.format(-minutesTotal, "minute")}`;
  }

  const hoursTotal = Math.floor(minutesTotal / 60);
  if (hoursTotal < 24) {
    return `Откликнулся ${rtf.format(-hoursTotal, "hour")}`;
  }

  const daysTotal = Math.floor(hoursTotal / 24);
  if (daysTotal < 30) {
    return `Откликнулся ${rtf.format(-daysTotal, "day")}`;
  }

  return `Заявка от ${d.toLocaleDateString("ru-RU")}`;
}
