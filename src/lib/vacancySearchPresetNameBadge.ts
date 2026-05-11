/** Эмодзи в духе IT / специальностей: техника, связь, данные, инструменты. */
const VACANCY_PRESET_BADGE_EMOJIS = [
  "💻",
  "🖥️",
  "⌨️",
  "🖱️",
  "📱",
  "📲",
  "☎️",
  "📞",
  "📡",
  "🌐",
  "🔌",
  "⚙️",
  "🔧",
  "🛠️",
  "🚀",
  "📊",
  "📈",
  "📉",
  "📋",
  "🗂️",
  "📝",
  "🧪",
  "🔬",
  "🔋",
  "🖨️",
  "🗄️",
] as const;

export function randomVacancySearchPresetBadgeEmoji(): string {
  const i = Math.floor(Math.random() * VACANCY_PRESET_BADGE_EMOJIS.length);
  return VACANCY_PRESET_BADGE_EMOJIS[i]!;
}

/** Имя нового пресета с префиксом случайного эмодзи (обрезка по `maxLength` в UTF-16). */
export function vacancySearchPresetNameWithRandomBadge(
  nameWithoutBadge: string,
  maxLength = 80,
): string {
  const badge = randomVacancySearchPresetBadgeEmoji();
  const core = nameWithoutBadge.trim();
  if (!core) return `${badge} `;
  const prefix = `${badge} `;
  let rest = core;
  while (prefix.length + rest.length > maxLength && rest.length > 0) {
    rest = rest.slice(0, -1);
  }
  return prefix + rest;
}
