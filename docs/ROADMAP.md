# Referi — Implementation Roadmap

> Версия 1.0 · Дата: 2026-04-17

Дорожная карта разбита на 8 фаз (Phase 0–7). Каждая фаза имеет чёткий набор deliverables и критерии готовности (Definition of Done). Фичи помечены флагами `[CORE]` / `[PAY]` / `[MOD]` / `[AUTO]` для понимания зависимостей.

---

## Зависимости между фазами

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
                                              ↑                    ↑
                                          (Phase 3)           (Phase 4)
```

Фазы 0–3 — строго последовательны. Фазы 5–6 могут вестись параллельно после завершения Phase 4.

---

## Phase 0 — Foundation

**Цель**: работающее пустое приложение с полной инфраструктурой разработки.

### Deliverables

| Задача                              | Флаг     | Описание                                                                 |
| ----------------------------------- | -------- | ------------------------------------------------------------------------ |
| Инициализация Next.js 15            | `[CORE]` | `npx create-next-app` с App Router, TypeScript strict, Tailwind CSS      |
| Prisma + PostgreSQL                 | `[CORE]` | `prisma init`, базовая конфигурация, первая пустая миграция              |
| Docker Compose                      | `[CORE]` | `postgres:16`, `redis:7`, `app` сервисы; `docker-compose.yml` для dev    |
| Redis + BullMQ                      | `[CORE]` | Клиент Redis, базовая очередь, тест подключения                          |
| Auth.js v5 базовая                  | `[CORE]` | Установка, настройка провайдера (без реального GitHub OAuth пока)        |
| tRPC v11                            | `[CORE]` | `initTRPC`, базовый `appRouter`, `superjson` transformer                 |
| CI pipeline                         | `[CORE]` | GitHub Actions: `lint` (ESLint + Prettier), `typecheck`, `test` (Vitest) |
| `.env.example`                      | `[CORE]` | Все переменные окружения с описаниями                                    |
| `shared/constants/businessRules.ts` | `[CORE]` | Все SLA, тарифы, лимиты из спецификации                                  |
| shadcn/ui                           | `[CORE]` | Установка, базовые компоненты: Button, Card, Input, Badge, Dialog        |

### Definition of Done

- [ ] `docker compose up` поднимает приложение без ошибок
- [ ] `npm run lint && npm run typecheck && npm run test` проходят
- [ ] `prisma migrate dev` выполняется без ошибок
- [ ] `GET /` возвращает заглушку главной страницы
- [ ] CI pipeline зелёный на пустом PR

---

## Phase 1 — Authentication & Registration

**Цель**: полный флоу регистрации через GitHub с age-check и платной регистрацией.

### Deliverables

| Задача                             | Флаг     | Описание                                                     |
| ---------------------------------- | -------- | ------------------------------------------------------------ |
| GitHub OAuth провайдер             | `[CORE]` | Auth.js + реальный GitHub OAuth App                          |
| Age-check в signIn callback        | `[CORE]` | `GET /user` → `created_at` → проверка 365 дней               |
| Полная Prisma schema               | `[CORE]` | Все модели из `spec-schema-database.md`; миграции            |
| Страница `/login`                  | `[CORE]` | Кнопка «Войти через GitHub», обработка ошибок                |
| Страница `/registration/age-gate`  | `[CORE]` | Объяснение + кнопка оплаты сбора                             |
| `auth.initiateRegistrationPayment` | `[PAY]`  | tRPC mutation; ЮКасса MockPaymentProvider                    |
| Обработка webhook регистрации      | `[PAY]`  | `payment.succeeded` → `paidRegistration = true`              |
| Профиль пользователя               | `[CORE]` | Страница `/dashboard/profile`; `auth.updateProfile` mutation |
| Middleware защита роутов           | `[CORE]` | Редирект на `/login` для неавторизованных                    |
| `auth.me` query                    | `[CORE]` | Данные текущего пользователя + роли + попытки                |

### Definition of Done

- [ ] Пользователь с GitHub аккаунтом > 1 года может войти и видит dashboard
- [ ] Пользователь с GitHub аккаунтом < 1 года попадает на age-gate страницу
- [ ] MockPaymentProvider позволяет «оплатить» сбор и войти
- [ ] `GitHubProfile.accessToken` зашифрован в БД
- [ ] Unit-тест на age-check с мок-датами (< 365 дней, > 365 дней)

---

## Phase 2 — Vacancies & Profiles

**Цель**: реферальщики могут создавать вакансии; соискатели — просматривать ленту с фильтрами.

### Deliverables

| Задача                          | Флаг     | Описание                                                        |
| ------------------------------- | -------- | --------------------------------------------------------------- |
| `vacancies.create` mutation     | `[CORE]` | Guard: 1 активная вакансия, пул попыток > 0                     |
| `vacancies.delete` mutation     | `[CORE]` | Cascade refund (пока без реальных денег)                        |
| `vacancies.list` query          | `[CORE]` | Фильтры: specialty, grade, workFormat, salary, query; пагинация |
| `vacancies.getById` query       | `[CORE]` | Без данных реферальщика                                         |
| `vacancies.myActive` query      | `[CORE]` | Текущая вакансия реферальщика                                   |
| Страница `/` — лента вакансий   | `[CORE]` | Карточки вакансий + фильтры + поиск                             |
| Страница `/vacancies/[id]`      | `[CORE]` | Детальная страница вакансии + кнопка «Откликнуться»             |
| Страница `/dashboard/vacancy`   | `[CORE]` | Реферальщик: управление своей вакансией                         |
| Форма создания вакансии         | `[CORE]` | Все поля из spec; валидация Zod                                 |
| `ReferrerAttemptLedger` базовый | `[CORE]` | `getAvailableAttempts()` возвращает корректное значение         |
| Full-text поиск                 | `[CORE]` | `pg_trgm` или `tsvector` для title/description                  |

### Definition of Done

- [ ] Реферальщик создаёт вакансию; вторая попытка создать вакансию заблокирована
- [ ] Лента отображает активные вакансии с корректными фильтрами
- [ ] Замороженные/удалённые вакансии не отображаются в ленте
- [ ] Full-text поиск по названию и описанию работает
- [ ] Unit-тесты на guard «1 активная вакансия»

---

## Phase 3 — Application Lifecycle (Core)

**Цель**: полный цикл заявки без реальных платежей; машина состояний работает полностью.

### Deliverables

| Задача                                    | Флаг     | Описание                                             |
| ----------------------------------------- | -------- | ---------------------------------------------------- |
| `applications.submit` mutation            | `[CORE]` | Guard: лимит 2, статус вакансии, уникальность пары   |
| `applications.cancel` mutation            | `[CORE]` | SUBMITTED / AWAITING_PAYMENT                         |
| `applications.confirmIntent` mutation     | `[CORE]` | Guards: попытки, активное рассмотрение, статус       |
| `applications.reject` mutation            | `[CORE]` | SUBMITTED → REJECTED_BY_REFERRER                     |
| `applications.confirmHandoff` mutation    | `[CORE]` | AWAITING_RESUME_HANDOFF → AWAITING_COMPANY_DECISION  |
| `applications.requestCancel` mutation     | `[CORE]` | AWAITING_RESUME_HANDOFF → SEEKER_CANCEL_REQUESTED    |
| `applications.acknowledgeCancel` mutation | `[CORE]` | SEEKER_CANCEL_REQUESTED → REFUNDED_BY_CANCEL_ACK     |
| `applications.acceptOffer` mutation       | `[CORE]` | AWAITING_COMPANY_DECISION → OFFER_ACCEPTED           |
| `applications.reportRejection` mutation   | `[CORE]` | Со стороны соискателя                                |
| `applications.confirmRejection`           | `[CORE]` | Реферальщик подтверждает отказ → REJECTED_BY_COMPANY |
| `applications.denyRejection`              | `[CORE]` | Реферальщик опровергает → DISPUTED                   |
| `AuditLog` запись при каждом переходе     | `[CORE]` | Все поля: from, to, actor, actorId, metadata         |
| `applications.myList` query               | `[CORE]` | Список заявок соискателя с текущими статусами        |
| `vacancies.applicants` query              | `[CORE]` | Список откликнувшихся для реферальщика               |
| Страница `/dashboard/applications`        | `[CORE]` | Соискатель: мои заявки + действия                    |
| Страница `/dashboard/vacancy/applicants`  | `[CORE]` | Реферальщик: список кандидатов                       |
| Правила видимости контактов               | `[CORE]` | contactInfo только в активных статусах               |
| Property-based тесты state machine        | `[CORE]` | fast-check, инварианты INV-001..007                  |

### Definition of Done

- [ ] Полный happy path от submit до offerAccepted работает без реальных платежей
- [ ] Все guards из spec-process-application-lifecycle.md проверены unit-тестами
- [ ] `AuditLog` создаётся при каждом переходе
- [ ] `contactInfo` не виден в `vacancies.applicants` после терминального статуса
- [ ] Соискатель не может откликнуться на > 2 вакансий одновременно

---

## Phase 4 — Payments & Escrow

**Цель**: реальные платежи через ЮКасса; подписки и разовые токены работают.

### Deliverables

| Задача                                    | Флаг    | Описание                                               |
| ----------------------------------------- | ------- | ------------------------------------------------------ |
| `YookassaPaymentProvider`                 | `[PAY]` | Реализация `PaymentProvider` интерфейса под ЮКасса API |
| `payments.createEscrow` mutation          | `[PAY]` | Создание платежа с холдом; возврат `confirmationUrl`   |
| Webhook `/api/webhooks/yookassa`          | `[PAY]` | Верификация HMAC; обработка событий                    |
| `paymentWorker`                           | `[PAY]` | BullMQ обработчик webhook-событий; идемпотентность     |
| `capturePayment` при offerAccepted        | `[PAY]` | capture + payout реферальщику                          |
| `refundPayment` при всех refund-переходах | `[PAY]` | SLA, cancel, vacancy deleted, moderator                |
| `payments.addPayoutCard`                  | `[PAY]` | Добавление карты реферальщика для выплат               |
| `payments.buyApplicationToken`            | `[PAY]` | Разовый токен отклика (199 ₽)                          |
| `PaidApplicationToken` использование      | `[PAY]` | При submit с токеном — лимит не проверяется            |
| `subscriptions.subscribe`                 | `[PAY]` | Подписка PRO (499 ₽/мес); рекуррентный платёж ЮКасса   |
| `subscriptions.cancel`                    | `[PAY]` | Отмена подписки                                        |
| `subscriptions.getMySubscription`         | `[PAY]` | Текущий статус подписки                                |
| Лимит 5 откликов с PRO                    | `[PAY]` | Guard в `applications.submit` проверяет подписку       |
| Polling fallback                          | `[PAY]` | BullMQ job если webhook не пришёл за 5 мин             |
| `calculateCommission`                     | `[PAY]` | Утилита + unit-тесты на граничные значения             |
| Страница оплаты (`/pay/[applicationId]`)  | `[PAY]` | Редирект на ЮКасса + обратный редирект                 |

### Definition of Done

- [ ] Реальный тестовый платёж через ЮКасса sandbox проходит end-to-end
- [ ] Webhook с невалидной подписью возвращает 401
- [ ] Идемпотентность: повторный webhook не создаёт дубль транзакции
- [ ] Подписка PRO расширяет лимит до 5 откликов
- [ ] Комиссия рассчитывается корректно (тест на 10 000 ₽ → 1 000 ₽ комиссия)

---

## Phase 5 — SLA Timers & Automation

**Цель**: все SLA-таймеры работают; авто-санкции, фриз вакансий, регенерация попыток.

### Deliverables

| Задача                                    | Флаг     | Описание                                           |
| ----------------------------------------- | -------- | -------------------------------------------------- |
| `slaWorker` — `reaction-sla`              | `[AUTO]` | Фриз вакансии через 7 дней без реакции             |
| `slaWorker` — `payment-deadline`          | `[AUTO]` | Отмена платежа через 5 дней                        |
| `slaWorker` — `resume-handoff-sla`        | `[AUTO]` | Возврат + бан реферальщика через 5 дней            |
| `slaWorker` — `cancel-ack-sla`            | `[AUTO]` | Авто-возврат через 3 дня                           |
| `slaWorker` — `company-decision-sla`      | `[AUTO]` | Авто-открытие спора через 30 дней                  |
| `slaWorker` — `vacancy-unfreeze`          | `[AUTO]` | Разморозка вакансии через 14 дней                  |
| `attemptRegenerationWorker`               | `[AUTO]` | Восстановление попытки через 60 дней               |
| Авто-удаление вакансии при OFFER_ACCEPTED | `[AUTO]` | Внутри команды `acceptOffer`                       |
| `vacancyDeletedCascade`                   | `[AUTO]` | Возврат средств и попыток при ручном удалении      |
| `ReferrerSanction` проверка в guards      | `[AUTO]` | `isReferrerBanned()` в `confirmReferralIntent`     |
| `deadline` поля в `Application`           | `[AUTO]` | Устанавливаются в командах; проверяются в воркерах |
| Уникальность `jobId` в BullMQ             | `[AUTO]` | Нет дубликатов при рестарте воркера                |
| Дашборд реферальщика: пул попыток         | `[AUTO]` | Отображение доступных попыток и дат регенерации    |

### Definition of Done

- [ ] Integration-тест: `resume-handoff-sla` срабатывает (mockdate + 5 дней) → деньги возвращены, бан создан
- [ ] Integration-тест: `reaction-sla` срабатывает → вакансия FROZEN, не в ленте
- [ ] Unit-тест: `getAvailableAttempts` = 3 при пустом ledger, 0 после 3 CONSUMED
- [ ] Тест на noop при изменившемся статусе заявки при срабатывании SLA
- [ ] `attempt-regen` не создаёт дубль `REGENERATED` при двойном срабатывании

---

## Phase 6 — Disputes, Moderation & Telegram Bot

**Цель**: модераторы могут разрешать споры; жалобы принимаются и обрабатываются.

### Deliverables

| Задача                                    | Флаг    | Описание                                                  |
| ----------------------------------------- | ------- | --------------------------------------------------------- |
| `TelegramService` + `setWebhook`          | `[MOD]` | Интеграция Telegram Bot API                               |
| Webhook `/api/webhooks/telegram`          | `[MOD]` | Верификация + очередь обработки                           |
| Команды бота `/link`, `/start`, `/status` | `[MOD]` | Привязка Telegram к аккаунту Referi                       |
| Уведомления модераторам о спорах          | `[MOD]` | При переходе в `DISPUTED`                                 |
| Уведомления пользователям                 | `[MOD]` | По всем ключевым событиям (таблица 4.6 из spec-telegram)  |
| `moderation.*` роутеры                    | `[MOD]` | Все процедуры из spec-design-api (resolve, abuse reports) |
| Admin-панель `/admin`                     | `[MOD]` | Список споров + жалоб + кнопки разрешения                 |
| `reports.submitAbuseReport`               | `[MOD]` | tRPC mutation + уведомление модераторам                   |
| Команды бота `/dispute`, `/resolve_*`     | `[MOD]` | Модераторские команды (MVP: только текстовые)             |
| `moderatorResolveForReferrer` command     | `[MOD]` | capture + payout → закрыть `ModeratorCase`                |
| `moderatorResolveForSeeker` command       | `[MOD]` | refund → закрыть `ModeratorCase`                          |
| Страница `/dashboard/applications/[id]`   | `[MOD]` | История `AuditLog`; кнопка «Пожаловаться»                 |
| Блокировка пользователя/вакансии          | `[MOD]` | `moderation.blockUser`, `moderation.blockVacancy`         |

### Definition of Done

- [ ] Webhook `/api/webhooks/telegram` без секрета возвращает 401
- [ ] `/link {token}` в боте создаёт `TelegramLink`; пользователь получает подтверждение
- [ ] При создании спора модераторы получают уведомление с командами разрешения
- [ ] Модератор через admin-панель разрешает спор → деньги уходят корректной стороне
- [ ] Жалоба отправленная через UI поступает в `TELEGRAM_MODERATOR_CHAT_ID`

---

## Phase 7 — Polish, Notifications & Production

**Цель**: продакшн-готовое приложение с email-уведомлениями, полным UI и e2e-тестами.

### Deliverables

| Задача                         | Флаг     | Описание                                                           |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| `emailService` (SMTP)          | `[CORE]` | Транзакционные письма для всех ключевых событий                    |
| Email-шаблоны                  | `[CORE]` | HTML-письма (React Email или MJML)                                 |
| Rate limiting middleware       | `[CORE]` | Edge middleware + Redis; таблица из spec-design-api                |
| Полировка UI                   | `[CORE]` | Адаптивность, accessibility (Lighthouse ≥ 95), темизация           |
| Страница настроек пользователя | `[CORE]` | Профиль, подписка, карта для выплат, привязка Telegram             |
| Дашборд соискателя             | `[CORE]` | Все активные заявки с дедлайнами и действиями                      |
| Дашборд реферальщика           | `[CORE]` | Вакансия, список кандидатов, пул попыток                           |
| E2E-тесты Playwright           | `[CORE]` | Сценарии: регистрация, создание вакансии, полный цикл заявки, спор |
| `docker-compose.prod.yml`      | `[CORE]` | Production конфигурация с env из secrets                           |
| CI/CD деплой                   | `[CORE]` | GitHub Actions → деплой на Yandex Cloud / Railway                  |
| Мониторинг                     | `[CORE]` | Sentry (ошибки) + базовые метрики BullMQ                           |
| Документация `.env.example`    | `[CORE]` | Все переменные с описаниями                                        |
| Seed-данные для демо           | `[CORE]` | `prisma/seed.ts` — демо-данные для staging                         |

### Definition of Done

- [ ] Все E2E-тесты Playwright проходят на staging
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 95 на главных страницах
- [ ] `npm run build` без ошибок TypeScript
- [ ] Деплой на production работает через CI/CD pipeline
- [ ] Sentry подключён и получает тестовую ошибку
- [ ] `prisma/seed.ts` создаёт демо-данные без ошибок

---

## Post-Launch: v1.1

| Фича                              | Описание                                                              |
| --------------------------------- | --------------------------------------------------------------------- |
| Telegram-уведомления по умолчанию | Уведомления в Telegram для всех пользователей (не только с привязкой) |
| Inline Keyboard в спорах          | Кнопки в Telegram вместо текстовых команд                             |
| Базовый антифрод                  | Детектор аномального поведения (множество откликов с одного IP)       |
| Расширенная аналитика             | Дашборд для реферальщика: конверсия, среднее время цикла              |
| Уведомления о дедлайнах           | Напоминания соискателю/реферальщику за 24 часа до дедлайна            |

## Post-Launch: v2.0

| Фича                       | Описание                                                       |
| -------------------------- | -------------------------------------------------------------- |
| Верификация по корп. email | Опциональная верификация реферальщика по `@company.com` домену |
| Рейтинг реферальщиков      | Публичный рейтинг на основе % успешных рефералов               |
| API для ATS                | Интеграция с системами подбора персонала                       |
| Корпоративные тарифы       | Для компаний с несколькими вакансиями одновременно             |

---

## Фича-флаги (Feature Flags)

В `shared/constants/featureFlags.ts`:

```typescript
export const FEATURE_FLAGS = {
  // Phase 4
  REAL_PAYMENTS: process.env.FEATURE_REAL_PAYMENTS === 'true',

  // Phase 6
  TELEGRAM_NOTIFICATIONS: process.env.FEATURE_TELEGRAM === 'true',
  EMAIL_NOTIFICATIONS: process.env.FEATURE_EMAIL === 'true',

  // Phase 7
  RATE_LIMITING: process.env.FEATURE_RATE_LIMITING === 'true',

  // v1.1
  ANTIFROD: false,
} as const;
```

Фича-флаги позволяют запускать Phase 4 (реальные платежи) только в production, сохраняя MockPaymentProvider в staging/development.

---

## Общий прогресс

| Фаза                          | Статус    |
| ----------------------------- | --------- |
| Phase 0 — Foundation          | ⬜ pending |
| Phase 1 — Auth                | ⬜ pending |
| Phase 2 — Vacancies           | ⬜ pending |
| Phase 3 — Application FSM     | ⬜ pending |
| Phase 4 — Payments            | ⬜ pending |
| Phase 5 — SLA & Automation    | ⬜ pending |
| Phase 6 — Moderation          | ⬜ pending |
| Phase 7 — Polish & Production | ⬜ pending |

*Статусы обновляются по мере прохождения Definition of Done каждой фазы.*
