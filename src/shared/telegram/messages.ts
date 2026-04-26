/**
 * Telegram message templates — spec/spec-tool-telegram-bot.md section 4.7
 */

export const telegramMessages = {
  newApplication: (data: { vacancyTitle: string }) =>
    `<b>Новый отклик</b> на вакансию <i>${escHtml(data.vacancyTitle)}</i>\n` +
    `Перейдите в личный кабинет, чтобы просмотреть кандидата.`,

  paymentReceived: (data: { vacancyTitle: string; amountRub: string }) =>
    `<b>💰 Оплата получена</b>\n` +
    `Вакансия: <i>${escHtml(data.vacancyTitle)}</i>\n` +
    `Сумма: ${data.amountRub} ₽\n` +
    `Теперь вы можете передать резюме HR.`,

  newDispute: (data: { caseId: string; appId: string; referrerName: string }) =>
    `<b>⚠️ Новый спор #${data.caseId}</b>\n` +
    `Заявка: <code>${data.appId}</code>\n` +
    `Реферальщик: ${escHtml(data.referrerName)}\n\n` +
    `Команды:\n/dispute ${data.caseId}\n` +
    `/resolve_referrer ${data.caseId}\n` +
    `/resolve_seeker ${data.caseId}`,

  newAbuseReport: (data: { reportId: string; reason: string; vacancyTitle?: string }) =>
    `<b>🚨 Жалоба #${data.reportId}</b>\n` +
    `Причина: ${escHtml(data.reason)}\n` +
    (data.vacancyTitle ? `Вакансия: <i>${escHtml(data.vacancyTitle)}</i>` : ""),

  vacancyFrozen: (data: { vacancyTitle: string; frozenUntil: string }) =>
    `<b>🔒 Вакансия заморожена</b>\n` +
    `"${escHtml(data.vacancyTitle)}"\n` +
    `Причина: нет реакции на отклики в течение 7 дней.\n` +
    `Разморозка: ${data.frozenUntil}`,

  referrerBanned: (data: { expiresAt: string }) =>
    `<b>🚫 Ограничение аккаунта</b>\n` +
    `Вы не можете брать кандидатов на рассмотрение до ${data.expiresAt}.\n` +
    `Причина: резюме не было передано HR в установленный срок.`,

  refundIssued: (data: { amountRub: string; reason: string }) =>
    `<b>💸 Возврат средств</b>\n` +
    `Сумма: ${data.amountRub} ₽\n` +
    `Причина: ${escHtml(data.reason)}\n` +
    `Средства поступят на карту в течение 10 рабочих дней.`,

  payoutInitiated: (data: { amountRub: string }) =>
    `<b>✅ Выплата инициирована</b>\n` +
    `Сумма: ${data.amountRub} ₽\n` +
    `Средства поступят на вашу карту в ближайшее время.`,

  attemptRegenerated: (data: { availableAttempts: number }) =>
    `<b>🔄 Попытка восстановлена</b>\n` + `Доступно попыток: <b>${data.availableAttempts}</b>`,

  cancelRequested: (data: { vacancyTitle: string; deadline: string }) =>
    `<b>❌ Запрос отмены заявки</b>\n` +
    `Вакансия: <i>${escHtml(data.vacancyTitle)}</i>\n` +
    `Соискатель просит отменить заявку.\n` +
    `Подтвердите до ${data.deadline}, иначе средства вернутся автоматически.`,

  accountLinked: () =>
    `<b>✅ Telegram успешно привязан к аккаунту Referi!</b>\n` +
    `Вы будете получать уведомления здесь.`,

  linkTokenExpired: () =>
    `<b>❌ Токен устарел</b>\n` + `Запросите новую ссылку для привязки на сайте Referi.`,
};

function escHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
