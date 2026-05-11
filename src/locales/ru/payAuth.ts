export const payAuth = {
  login: {
    cardDescription: "Реферальная платформа для разработчиков",
    hint: "Войдите через GitHub, чтобы продолжить",
    registrationNote: "Для регистрации требуется GitHub аккаунт старше 1 года",
    github: "Войти через GitHub",
  },
  registration: {
    payPending: "Создание платежа…",
    payCta: (fee: string) => `Оплатить ${fee} и зарегистрироваться`,
    githubTooNewTitle: "Аккаунт GitHub слишком новый",
    githubTooNewBody: "Для защиты от спама и фейков требуется, чтобы ваш GitHub аккаунт существовал минимум",
    daysWord: "дней",
    paidTitle: "Альтернатива: платная регистрация",
    paidBodyBefore: "Вы можете зарегистрироваться сейчас, оплатив разовый сбор в размере",
    paidBodyAfter: ". Этот сбор не возвращается.",
    sessionMissing: "Сессия не найдена. Вернитесь на страницу входа и попробуйте снова.",
    backToLogin: "← Вернуться к входу",
  },
  mock: {
    noPaymentId: "Нет paymentId в ссылке",
    httpError: (status: number) => `Ошибка ${status}`,
    title: "Тестовая оплата (mock)",
    descriptionIntro:
      "Нажмите кнопку, чтобы зачислить тестовый платёж и перейти дальше. Доступно при",
    credit: "Зачислить тестовый платёж",
  },
  application: {
    title: "Оплата заявки",
    escrowAmount: "Сумма эскроу",
    escrowHint: "Средства замораживаются до получения оффера. При отмене — полный возврат.",
    paymentExistsTitle: "Платёж уже создан",
    paymentExistsDescription: "Продолжите оплату через кнопку ниже.",
    backToApplication: "Вернуться к заявке",
    payPending: "Создание платежа…",
    payCta: "Перейти к оплате",
  },
  moderationLinkDefault: "Связаться с модерацией",
} as const;
