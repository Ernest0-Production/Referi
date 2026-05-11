/** Тексты для платёжных описаний и сообщений валидации на сервере (ru). */
export const server = {
  vacancies: {
    salaryOrder: "Минимальная зарплата не может быть меньше максимальной",
    compensationRange: "Компенсация реферальщику должна быть от 0 до 100 000 ₽ с шагом 10 000 ₽.",
  },
  vacancySearchPresets: {
    paramsOrName: "Укажите параметры или название фильтра",
  },
  subscriptions: {
    proMonthly: "Подписка Referi PRO на 1 месяц",
  },
  moderation: {
    refundModerator: "Возврат по решению модератора",
  },
  auth: {
    registrationFee: "Регистрационный сбор Referi",
  },
  payments: {
    deal: (applicationId: string) => `Сделка Referi по заявке ${applicationId}`,
    application: (title: string, company: string) =>
      `Заявка на рефералку "${title}" в ${company}`,
    extraRequest: (title: string) => `Дополнительный запрос на рефералку «${title}»`,
  },
  paymentWorker: {
    reward: (applicationId: string) => `Реферальное вознаграждение по заявке ${applicationId}`,
    refundApplication: (applicationId: string) => `Возврат по заявке ${applicationId}`,
    refundToken: (tokenId: string) => `Возврат токена запроса ${tokenId}`,
    proRenewal: "Продление Referi PRO на 1 месяц",
  },
  slaWorker: {
    refundResumeSla: "Возврат по истечении SLA передачи резюме",
    resumeMissedReason: "Не передал резюме HR в установленный срок",
    refundSeekerRequest: "Авто-возврат по запросу соискателя",
  },
  accountDeletion: {
    reward: (applicationId: string) => `Реферальное вознаграждение по заявке ${applicationId}`,
    refundApplication: (applicationId: string) =>
      `Возврат при удалении аккаунта по заявке ${applicationId}`,
    refundToken: (tokenId: string) => `Возврат токена при удалении аккаунта ${tokenId}`,
  },
  deleteAccount: {
    staffBlocked: "Удаление недоступно для аккаунтов персонала",
  },
} as const;
