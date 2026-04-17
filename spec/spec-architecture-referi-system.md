---
title: Referi — System Architecture Specification
version: 1.0
date_created: 2026-04-17
owner: Referi Engineering
tags: architecture, infrastructure, design, app
---

# Introduction

Данная спецификация описывает высокоуровневую архитектуру системы Referi: разбивку на модули, bounded contexts, потоки данных и принципы взаимодействия компонентов. Документ является основным референсом для всех остальных технических спецификаций.

## 1. Purpose & Scope

**Назначение**: зафиксировать архитектурные решения, границы ответственности каждого компонента и правила их взаимодействия.

**Область применения**: вся серверная и клиентская часть приложения Referi версии 1.0.

**Аудитория**: инженеры, AI-агенты, генерирующие код по этой спецификации.

**Допущения**:
- Единственная среда исполнения — веб-браузер + Node.js сервер.
- Мобильное приложение в рамках v1.0 не предусмотрено.
- Монолитная архитектура с логическим разделением на модули (modular monolith).

---

## 2. Definitions

| Термин          | Определение                                                           |
| --------------- | --------------------------------------------------------------------- |
| **Seeker**      | Пользователь в роли соискателя работы                                 |
| **Referrer**    | Пользователь в роли сотрудника компании, размещающего вакансию        |
| **Moderator**   | Сотрудник Referi, разрешающий споры                                   |
| **Application** | Заявка соискателя на конкретную вакансию                              |
| **Vacancy**     | Объявление о вакансии, созданное реферальщиком                        |
| **Escrow**      | Механизм удержания денег на счёте Referi до выполнения условий сделки |
| **SLA**         | Service Level Agreement — обязательный срок выполнения действия       |
| **Attempt**     | Единица из глобального пула попыток реферальщика (макс. 3)            |
| **BullMQ Job**  | Фоновая задача с отложенным запуском для SLA-таймеров                 |
| **tRPC**        | Type-safe RPC фреймворк, работающий поверх HTTP                       |
| **RSC**         | React Server Components                                               |
| **AuditLog**    | Неизменяемая запись о переходе состояния                              |

---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Приложение должно быть реализовано как monorepo с единым Next.js 15 приложением (App Router).
- **REQ-002**: Вся бизнес-логика серверная; клиент получает данные через tRPC или RSC.
- **REQ-003**: Все денежные суммы хранятся в базе данных как целые числа (копейки, `BigInt`); конвертация в рубли происходит только в слое представления.
- **REQ-004**: Каждый переход состояния `Application` должен создавать запись в `AuditLog`.
- **REQ-005**: Вся аутентификация происходит через Auth.js v5; прямые вызовы GitHub API для age-check происходят на сервере, не в браузере.
- **CON-001**: Хранение файлов резюме запрещено. Сервис хранит только текстовые данные (контакты, биография, cover letter).
- **CON-002**: Карточные данные пользователей никогда не поступают на серверы Referi (только через ЮКасса hosted fields / redirect).
- **CON-003**: Максимальное время ответа API на запросы ленты вакансий — 500 мс при нагрузке 100 rps.
- **SEC-001**: Все inter-service вебхуки должны верифицироваться по подписи (HMAC для ЮКасса, secret token для Telegram).
- **SEC-002**: Контактная информация соискателя должна быть доступна только авторизованному реферальщику данной вакансии, и только если заявка находится в активном статусе (не `cancelled`, не `rejected*`, не `refunded*`).
- **GUD-001**: Новые модули должны следовать структуре директорий, описанной в разделе 4.
- **PAT-001**: Паттерн Repository — весь доступ к БД инкапсулируется в `server/repositories/*.ts`; бизнес-логика не вызывает Prisma напрямую.
- **PAT-002**: Паттерн Command — каждый переход состояния реализован как изолированная функция в `server/commands/*.ts` с полными guard-проверками.

---

## 4. Interfaces & Data Contracts

### 4.1 Структура директорий

```
referi/
├── src/
│   ├── app/                         # Next.js App Router pages & layouts
│   │   ├── (public)/                # Публичные маршруты (лента вакансий)
│   │   ├── (auth)/                  # Страницы авторизации
│   │   ├── dashboard/               # Личный кабинет (seeker / referrer)
│   │   ├── admin/                   # Admin-панель (только модераторы/админы)
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts # tRPC handler
│   │       ├── auth/[...nextauth]/  # Auth.js handler
│   │       ├── webhooks/
│   │       │   ├── yookassa/        # POST /api/webhooks/yookassa
│   │       │   └── telegram/        # POST /api/webhooks/telegram
│   │       └── cron/                # Служебные endpoints для Railway Cron
│   ├── server/
│   │   ├── trpc/                    # tRPC router definitions
│   │   │   ├── routers/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── vacancies.ts
│   │   │   │   ├── applications.ts
│   │   │   │   ├── payments.ts
│   │   │   │   ├── subscriptions.ts
│   │   │   │   └── moderation.ts
│   │   │   ├── context.ts           # tRPC context (session, db)
│   │   │   └── root.ts              # AppRouter
│   │   ├── repositories/            # Доступ к БД (PAT-001)
│   │   │   ├── vacancyRepository.ts
│   │   │   ├── applicationRepository.ts
│   │   │   ├── userRepository.ts
│   │   │   ├── escrowRepository.ts
│   │   │   └── auditLogRepository.ts
│   │   ├── commands/                # Команды переходов состояний (PAT-002)
│   │   │   ├── confirmReferralIntent.ts
│   │   │   ├── confirmResumeHandoff.ts
│   │   │   ├── acceptOffer.ts
│   │   │   ├── reportRejection.ts
│   │   │   ├── seekerRequestCancel.ts
│   │   │   └── moderatorResolveDispute.ts
│   │   ├── services/
│   │   │   ├── paymentService.ts    # Абстракция PaymentProvider
│   │   │   ├── telegramService.ts   # Отправка сообщений в Telegram
│   │   │   ├── emailService.ts      # SMTP-отправка
│   │   │   └── githubService.ts     # GitHub REST (age-check)
│   │   └── workers/                 # BullMQ jobs
│   │       ├── slaWorker.ts
│   │       ├── attemptRegenerationWorker.ts
│   │       └── paymentWorker.ts
│   ├── shared/
│   │   ├── constants/
│   │   │   └── businessRules.ts     # Все SLA, лимиты, тарифы
│   │   ├── types/
│   │   │   ├── applicationStatus.ts # ApplicationStatus enum
│   │   │   └── vacancyStatus.ts     # VacancyStatus enum
│   │   └── utils/
│   │       └── money.ts             # Конвертация копеек ↔ рубли
│   ├── components/                  # Переиспользуемые UI-компоненты
│   └── lib/
│       ├── prisma.ts                # Prisma Client singleton
│       ├── redis.ts                 # Redis/BullMQ client
│       └── auth.ts                  # Auth.js config
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── config/
│   └── businessRules.ts             # Re-export из shared/constants
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

### 4.2 Bounded Contexts

```
┌─────────────────────────────────────────────────────────┐
│                     IDENTITY CONTEXT                     │
│  User · GitHubProfile · SeekerSubscription               │
│  Commands: registerWithGitHub, payRegistrationFee        │
└──────────────────────┬──────────────────────────────────┘
                       │ userId
┌──────────────────────▼──────────────────────────────────┐
│                     VACANCY CONTEXT                      │
│  Vacancy · VacancyStatus · ReferrerAttemptLedger         │
│  Commands: createVacancy, deleteVacancy, freezeVacancy   │
└──────────────────────┬──────────────────────────────────┘
                       │ vacancyId
┌──────────────────────▼──────────────────────────────────┐
│                  APPLICATION CONTEXT                     │
│  Application · ApplicationContent · ApplicationStatus    │
│  Commands: submitApplication, confirmReferralIntent,     │
│            seekerCancelRequest, confirmResumeHandoff,    │
│            acceptOffer, reportRejection                  │
└────────────┬────────────────────────┬───────────────────┘
             │ applicationId           │ applicationId
┌────────────▼────────┐  ┌────────────▼────────────────────┐
│   PAYMENT CONTEXT   │  │       MODERATION CONTEXT         │
│  EscrowTransaction  │  │  ModeratorCase · AbuseReport     │
│  PaymentProvider    │  │  TelegramNotification            │
│  hold/capture/      │  │  Commands: openDispute,          │
│  refund/payout      │  │  resolveDispute, blockUser       │
└─────────────────────┘  └──────────────────────────────────┘
             │
┌────────────▼────────┐
│    AUDIT CONTEXT    │
│    AuditLog         │
│  (append-only)      │
└─────────────────────┘
```

### 4.3 Request Flow — Типовой запрос (пример: `submitApplication`)

```
Browser
  │  POST /api/trpc/applications.submit
  ▼
tRPC Handler (app/api/trpc/[trpc]/route.ts)
  │  validateSession(ctx)
  ▼
applications.submit router
  │  1. Check seeker active application limit
  │  2. Check vacancy status = ACTIVE
  │  3. Validate ApplicationContent (bio ≤ 1000, cover ≤ 300)
  ▼
applicationRepository.create(data)
  │
  ▼
auditLogRepository.append({ applicationId, event: 'submitted', actor: seekerId })
  │
  ▼
telegramService.notifyReferrer(vacancy.referrerId, applicationId)  [async, non-blocking]
  │
  ▼
Response { applicationId, status: 'submitted' }
```

### 4.4 Webhook Flow — ЮКасса

```
ЮКасса
  │  POST /api/webhooks/yookassa
  │  Headers: Authorization: <HMAC-SHA256>
  ▼
verifyYookassaSignature(request)
  │  throws 401 if invalid
  ▼
parsePaymentEvent(body)
  │
  ├── event = 'payment.succeeded' → paymentWorker.handleSuccess(paymentId)
  ├── event = 'payment.canceled'  → paymentWorker.handleCancel(paymentId)
  ├── event = 'refund.succeeded'  → paymentWorker.handleRefundSuccess(refundId)
  └── event = 'payout.succeeded'  → paymentWorker.handlePayoutSuccess(payoutId)
  │
  ▼
Response 200 OK (всегда, если подпись валидна)
```

### 4.5 SLA Timer Flow — BullMQ

```
Событие в Application (например, awaitingResumeHandoff)
  │
  ▼
slaWorker.scheduleJob({
  jobId: `sla:resume-handoff:${applicationId}`,
  delay: SLA_RESUME_HANDOFF_MS,     // 5 дней в мс
  data: { applicationId, type: 'resumeHandoff' }
})
  │
  ▼ (через 5 дней)
slaWorker.process(job)
  │  Check: application.status still === 'awaitingResumeHandoff'?
  ├── Yes → refundBySLA(applicationId) + banReferrer(referrerId, 30d)
  └── No  → noop (job removed)
```

---

## 5. Acceptance Criteria

- **AC-001**: Given запрос к `/api/trpc/vacancies.list`, When в БД 1000 активных вакансий, Then ответ возвращается за ≤ 500 мс.
- **AC-002**: Given вебхук от ЮКассы с невалидной подписью, When система получает запрос, Then возвращает HTTP 401 и не изменяет состояние БД.
- **AC-003**: Given вебхук от ЮКассы с валидной подписью `payment.succeeded`, When соответствующий платёж найден в БД, Then статус `Application` переходит в `awaitingResumeHandoff` и создаётся запись в `AuditLog`.
- **AC-004**: Given реферальщик запрашивает контакты соискателя по чужой заявке, When система проверяет права, Then возвращает HTTP 403.
- **AC-005**: Given BullMQ worker перезапустился, When в очереди есть jobs с уникальными jobId, Then дублирующих переходов состояний не происходит.
- **AC-006**: Given директория `server/repositories/`, When код в `server/commands/*.ts` нужен доступ к БД, Then вызов идёт через repository, а не напрямую через Prisma Client.

---

## 6. Test Automation Strategy

- **Unit-тесты** (Vitest): команды (`server/commands/*.ts`) тестируются с мок-репозиториями; полное покрытие guard-условий.
- **Integration-тесты** (Vitest + testcontainers): репозитории тестируются на реальной Postgres-БД в контейнере.
- **Property-based тесты** (fast-check): машина состояний Application — генерация случайных последовательностей действий и проверка инвариантов.
- **E2E-тесты** (Playwright): ключевые user journeys (регистрация, создание вакансии, полный цикл заявки).
- **Webhook-тесты**: мок-сервер ЮКассы, тест обработки `payment.succeeded` / `refund.succeeded`.
- **Coverage**: минимум 80% строк для `server/commands/` и `server/services/`.

---

## 7. Rationale & Context

**Monorepo, не микросервисы**: на стадии MVP монолит значительно снижает операционную сложность. Разделение на bounded contexts в коде позволяет извлечь сервисы позже без переписывания логики.

**tRPC вместо REST**: полная типобезопасность между клиентом и сервером устраняет целый класс ошибок рассогласования контрактов без кодогенерации.

**BullMQ для SLA**: Redis — надёжное хранилище с персистентностью (AOF/RDB). Уникальные `jobId` обеспечивают идемпотентность при рестартах.

**Prisma**: декларативная schema как source of truth для типов и БД одновременно.

---

## 8. Dependencies & External Integrations

### External Systems
- **EXT-001**: GitHub REST API v3 — OAuth аутентификация + чтение `user.created_at` для age-check.

### Third-Party Services
- **SVC-001**: ЮКасса Payments API — авторизация платежей, холдирование, возвраты. SLA ответа API ≤ 3 с.
- **SVC-002**: ЮКасса Payouts API — выплаты на банковские карты физлицам.
- **SVC-003**: Telegram Bot API — отправка сообщений, получение команд от модераторов, приём жалоб.
- **SVC-004**: SMTP-провайдер (Mailgun / SendPulse) — транзакционные email-уведомления.

### Infrastructure Dependencies
- **INF-001**: PostgreSQL 16 — основная реляционная БД.
- **INF-002**: Redis 7+ — хранилище очередей BullMQ, кэш сессий.
- **INF-003**: Node.js 20+ LTS — среда исполнения сервера.

### Technology Platform Dependencies
- **PLT-001**: Next.js 15 с App Router — обязательно; версия 14 не поддерживается (требуется Server Actions v2 и async cookies).
- **PLT-002**: Auth.js v5 — несовместим с Auth.js v4; использовать только v5 API.

### Compliance Dependencies
- **COM-001**: ФЗ «О персональных данных» (152-ФЗ) — данные пользователей (контакты) должны храниться на серверах в РФ.
- **COM-002**: Правила платёжных систем — Referi не является платёжным агентом; необходимо юридическое оформление эскроу-механизма.

---

## 9. Examples & Edge Cases

### Edge Case: Гонка состояний при подтверждении реферальщика

```typescript
// server/commands/confirmReferralIntent.ts
export async function confirmReferralIntent(
  applicationId: string,
  referrerId: string
): Promise<Application> {
  // Pessimistic lock: SELECT ... FOR UPDATE
  const application = await applicationRepository.findByIdForUpdate(applicationId);

  // Guards
  if (application.status !== 'submitted') {
    throw new BusinessError('APPLICATION_WRONG_STATUS');
  }
  if (application.vacancy.referrerId !== referrerId) {
    throw new ForbiddenError();
  }
  const attempts = await referrerAttemptRepository.getAvailable(referrerId);
  if (attempts <= 0) {
    throw new BusinessError('NO_ATTEMPTS_LEFT');
  }
  const activeReviews = await applicationRepository.countActiveReviewsByReferrer(referrerId);
  if (activeReviews >= 1) {
    throw new BusinessError('ACTIVE_REVIEW_LIMIT_REACHED');
  }

  // Transition
  await referrerAttemptRepository.consume(referrerId, applicationId);
  const updated = await applicationRepository.updateStatus(applicationId, 'awaitingPayment');
  await auditLogRepository.append({ applicationId, event: 'awaitingPayment', actor: referrerId });

  return updated;
}
```

### Edge Case: Ручное удаление вакансии с активными заявками

```typescript
// server/commands/deleteVacancy.ts
// Должен выполняться в транзакции:
// 1. Получить все активные заявки по вакансии (FOR UPDATE)
// 2. Для каждой: если есть холд в escrow → инициировать refund
// 3. Перевести все заявки в refundedByVacancyDeleted
// 4. НЕ уменьшать attempt_ledger (ручное удаление — не наказание)
// 5. Обновить статус вакансии на DELETED
// 6. Создать AuditLog записи для каждой затронутой заявки
```

---

## 10. Validation Criteria

1. Структура директорий соответствует схеме в разделе 4.1.
2. Ни один файл в `src/app/` не импортирует Prisma Client напрямую (только через репозитории).
3. Все `ApplicationStatus` переходы определены как функции в `server/commands/`.
4. Все денежные операции используют тип `BigInt` для суммы в копейках.
5. Все вебхуки имеют тест на невалидную подпись (ожидаемый результат: 401).

---

## 11. Related Specifications

- [spec-schema-database.md](spec-schema-database.md) — схема БД
- [spec-process-application-lifecycle.md](spec-process-application-lifecycle.md) — машина состояний заявки
- [spec-process-referrer-sla.md](spec-process-referrer-sla.md) — SLA и санкции
- [spec-data-payments-escrow.md](spec-data-payments-escrow.md) — платежи и эскроу
- [spec-design-api.md](spec-design-api.md) — API контракты
- [spec-tool-github-auth.md](spec-tool-github-auth.md) — GitHub OAuth
- [spec-tool-telegram-bot.md](spec-tool-telegram-bot.md) — Telegram-бот
