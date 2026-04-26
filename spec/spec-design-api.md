---
title: Referi — API Design Specification (tRPC + REST Webhooks)
version: 1.0
date_created: 2026-04-17
owner: Referi Engineering
tags: design, architecture, app
---

# Introduction

Данная спецификация описывает все API-контракты Referi: tRPC-роутеры с их процедурами, REST-вебхуки, правила авторизации и rate limits.

## 1. Purpose & Scope

**Назначение**: определить полный список публичных и внутренних API-процедур, чтобы фронтенд и серверные команды могли разрабатываться независимо.

**Аудитория**: фронтенд-разработчики, AI-агенты, QA.

**Допущения**:
- tRPC v11 с App Router Next.js интеграцией.
- Авторизация через Auth.js v5; `session.user.id` доступен в tRPC context.
- Все мутации требуют аутентификации (кроме явно отмеченных `public`).

---

## 2. Definitions

| Термин         | Определение                                                         |
| -------------- | ------------------------------------------------------------------- |
| **Query**      | tRPC процедура для чтения данных (GET-семантика)                    |
| **Mutation**   | tRPC процедура для записи/изменения данных (POST-семантика)         |
| **Middleware** | tRPC middleware для проверки прав (isAuth, isReferrer, isModerator) |
| **Zod schema** | TypeScript-схема валидации входных данных                           |
| **ctx**        | tRPC context: `{ session, db, ip }`                                 |

---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Каждая процедура валидирует input через Zod-схему.
- **REQ-002**: Авторизационные проверки реализуются через tRPC middleware, не внутри процедур.
- **REQ-003**: Все денежные поля в ответах API (kopecks) сериализуются как строки (`string`) из-за ограничений JSON и BigInt.
- **REQ-004**: Процедуры чтения (`query`) не должны менять состояние системы.
- **REQ-005**: REST-вебхуки (`/api/webhooks/*`) не используют tRPC; обрабатываются напрямую в Next.js Route Handlers.
- **SEC-001**: tRPC context проверяет наличие валидной сессии Auth.js для всех non-public процедур.
- **SEC-002**: Rate limits применяются на уровне Edge middleware или reverse proxy.
- **GUD-001**: Названия процедур в camelCase; формат `{resource}.{action}` (например: `vacancies.list`, `applications.submit`).

---

## 4. Interfaces & Data Contracts

### 4.1 tRPC Middleware

```typescript
// server/trpc/context.ts
export type Context = {
  session: Session | null;
  db: PrismaClient;
  ip: string;
};

// server/trpc/middleware.ts
const isAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

const isReferrerOfVacancy = (vacancyId: string) =>
  t.middleware(async ({ ctx, next }) => {
    const vacancy = await ctx.db.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy || vacancy.referrerId !== ctx.session!.user.id)
      throw new TRPCError({ code: 'FORBIDDEN' });
    return next();
  });

const isModerator = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user.roles.includes('MODERATOR'))
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next();
});
```

### 4.2 Router: `auth`

| Процедура                          | Тип      | Auth   | Входные данные                             | Описание                                      |
| ---------------------------------- | -------- | ------ | ------------------------------------------ | --------------------------------------------- |
| `auth.me`                          | query    | isAuth | —                                          | Текущий пользователь + роли + лимиты          |
| `auth.updateProfile`               | mutation | isAuth | `{ displayName, contactInfo, bio, roles }` | Обновить профиль                              |
| `auth.checkRegistrationStatus`     | query    | public | `{ githubId }`                             | Нужна ли платная регистрация                  |
| `auth.initiateRegistrationPayment` | mutation | isAuth | —                                          | Создать платёж за регистрацию (если < 1 года) |

### 4.3 Router: `vacancies`

| Процедура              | Тип      | Auth   | Входные данные                                                                                             | Описание                                                    |
| ---------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `vacancies.list`       | query    | public | `{ specialty?, grade?, workFormat?, salaryFrom?, salaryTo?, query?, page?, limit? }`                       | Лента активных вакансий с фильтрами                         |
| `vacancies.getById`    | query    | public | `{ id }`                                                                                                   | Детальная страница вакансии (без данных реферальщика)       |
| `vacancies.create`     | mutation | isAuth | `{ title, companyName, specialty, grade, workFormat, salaryFrom?, salaryTo?, description, rewardKopecks }` | Создать вакансию; guard: 1 активная вакансия                |
| `vacancies.delete`     | mutation | isAuth | `{ id }`                                                                                                   | Удалить вакансию; cascade refund                            |
| `vacancies.myActive`   | query    | isAuth | —                                                                                                          | Активная вакансия текущего реферальщика                     |
| `vacancies.applicants` | query    | isAuth | `{ vacancyId }`                                                                                            | Список заявок на вою вакансию (только контакты, bio, cover) |

**Схема ответа `vacancies.list`** (элемент):
```typescript
type VacancyListItem = {
  id: string;
  title: string;
  companyName: string;
  specialty: Specialty;
  grade: Grade;
  workFormat: WorkFormat;
  salaryFromKopecks: string | null;  // BigInt → string
  salaryToKopecks: string | null;
  rewardKopecks: string;
  description: string;
  createdAt: string;  // ISO 8601
  // Имя/контакты реферальщика НЕ возвращаются
};
```

### 4.4 Router: `applications`

| Процедура                        | Тип      | Auth   | Входные данные                                  | Описание                                                            |
| -------------------------------- | -------- | ------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| `applications.submit`            | mutation | isAuth | `{ vacancyId, contactInfo, bio, coverLetter? }` | Откликнуться; guard: лимиты, статус вакансии                        |
| `applications.cancel`            | mutation | isAuth | `{ applicationId }`                             | Отозвать отклик (SUBMITTED / AWAITING_PAYMENT)                      |
| `applications.requestCancel`     | mutation | isAuth | `{ applicationId }`                             | Запросить отмену (AWAITING_RESUME_HANDOFF)                          |
| `applications.myList`            | query    | isAuth | `{ status? }`                                   | Мои заявки как соискателя                                           |
| `applications.getById`           | query    | isAuth | `{ applicationId }`                             | Детали заявки (для соискателя или реферальщика)                     |
| `applications.confirmIntent`     | mutation | isAuth | `{ applicationId }`                             | Реферальщик: подтвердить намерение рефералить                       |
| `applications.reject`            | mutation | isAuth | `{ applicationId }`                             | Реферальщик: отклонить кандидата                                    |
| `applications.acknowledgeCancel` | mutation | isAuth | `{ applicationId }`                             | Реферальщик: подтвердить запрос отмены соискателя                   |
| `applications.confirmHandoff`    | mutation | isAuth | `{ applicationId }`                             | Реферальщик: подтвердить передачу резюме HR                         |
| `applications.acceptOffer`       | mutation | isAuth | `{ applicationId }`                             | Соискатель: принял оффер                                            |
| `applications.reportRejection`   | mutation | isAuth | `{ applicationId }`                             | Соискатель: получил отказ компании                                  |
| `applications.confirmRejection`  | mutation | isAuth | `{ applicationId }`                             | Реферальщик: подтвердить отказ компании                             |
| `applications.denyRejection`     | mutation | isAuth | `{ applicationId }`                             | Реферальщик: опровергнуть отказ компании (→ disputed)               |
| `applications.getAuditLog`       | query    | isAuth | `{ applicationId }`                             | История переходов состояний (только для участников или модераторов) |

**Правила видимости данных в `applications.getById`**:
- Соискатель видит: всё своё содержимое + статус + deadline-даты.
- Реферальщик видит: `contactInfo`, `bio`, `coverLetter`, `status`, `displayName` соискателя (если заявка в активном статусе).
- Реферальщик НЕ видит данные по заявке после перехода в терминальное состояние (кроме `OFFER_ACCEPTED` — виден результат).

### 4.5 Router: `payments`

| Процедура                      | Тип      | Auth   | Входные данные      | Описание                                                                         |
| ------------------------------ | -------- | ------ | ------------------- | -------------------------------------------------------------------------------- |
| `payments.createEscrow`        | mutation | isAuth | `{ applicationId }` | Инициировать оплату заказчика по заявке в **безопасной сделке** ЮKassa; идентификатор процедуры в API без переименования; возвращает `{ confirmationUrl }` |
| `payments.buyApplicationToken` | mutation | isAuth | `{ vacancyId }`     | Купить разовый токен отклика; возвращает `{ confirmationUrl }`                   |
| `payments.addPayoutCard`       | mutation | isAuth | —                   | Добавить карту для выплат (ЮKassa hosted form); возвращает `{ confirmationUrl }` |
| `payments.escrowStatus`        | query    | isAuth | `{ applicationId }` | Статус зеркальной записи платежа/сделки (`EscrowTransaction`) по заявке          |

### 4.6 Router: `subscriptions`

| Процедура                         | Тип      | Auth   | Входные данные | Описание                           |
| --------------------------------- | -------- | ------ | -------------- | ---------------------------------- |
| `subscriptions.getMySubscription` | query    | isAuth | —              | Текущая подписка соискателя        |
| `subscriptions.subscribe`         | mutation | isAuth | —              | Оформить подписку «Соискатель PRO» |
| `subscriptions.cancel`            | mutation | isAuth | —              | Отменить подписку                  |

### 4.7 Router: `moderation` (только MODERATOR / ADMIN)

| Процедура                       | Тип      | Auth        | Входные данные                         | Описание                      |
| ------------------------------- | -------- | ----------- | -------------------------------------- | ----------------------------- |
| `moderation.openCases`          | query    | isModerator | —                                      | Список открытых споров        |
| `moderation.getCaseById`        | query    | isModerator | `{ caseId }`                           | Детали спора + история заявки |
| `moderation.resolveForReferrer` | mutation | isModerator | `{ caseId, notes? }`                   | Решение в пользу реферальщика |
| `moderation.resolveForSeeker`   | mutation | isModerator | `{ caseId, notes? }`                   | Решение в пользу соискателя   |
| `moderation.abuseReports`       | query    | isModerator | `{ status? }`                          | Список жалоб                  |
| `moderation.resolveAbuseReport` | mutation | isModerator | `{ reportId, resolution, blockUser? }` | Разрешить жалобу              |
| `moderation.blockUser`          | mutation | isModerator | `{ userId, reason, expiresAt }`        | Заблокировать пользователя    |
| `moderation.blockVacancy`       | mutation | isModerator | `{ vacancyId, reason }`                | Заблокировать вакансию        |

### 4.8 Router: `reports` (жалобы, публичный)

| Процедура                   | Тип      | Auth   | Входные данные                     | Описание         |
| --------------------------- | -------- | ------ | ---------------------------------- | ---------------- |
| `reports.submitAbuseReport` | mutation | isAuth | `{ vacancyId?, reason, comment? }` | Отправить жалобу |

### 4.9 REST Webhook Routes

| Путь                      | Метод    | Описание                             |
| ------------------------- | -------- | ------------------------------------ |
| `/api/webhooks/yookassa`  | POST     | Входящие события ЮKassa (платежи, сделки) |
| `/api/webhooks/telegram`  | POST     | Входящие обновления Telegram Bot API |
| `/api/auth/[...nextauth]` | GET/POST | Auth.js handler                      |

**Верификация `/api/webhooks/yookassa`**:
```
Header: Authorization: Basic {base64(shopId:secretKey)}
или
Проверка HMAC-SHA256 тела запроса с секретом
```

**Верификация `/api/webhooks/telegram`**:
```
Header: X-Telegram-Bot-Api-Secret-Token: {TELEGRAM_WEBHOOK_SECRET}
```

### 4.10 Rate Limits

| Группа запросов                    | Лимит                                         |
| ---------------------------------- | --------------------------------------------- |
| Публичные queries (лента вакансий) | 60 req / мин / IP                             |
| Authenticated mutations (общее)    | 20 req / мин / userId                         |
| `applications.submit`              | 5 req / мин / userId                          |
| `reports.submitAbuseReport`        | 3 req / ч / userId                            |
| Вебхуки ЮKassa                     | Без ограничений (белый список IP ЮKassa)      |
| Вебхуки Telegram                   | Без ограничений (верификация по secret token) |

Rate limits реализуются через Edge middleware с Redis как хранилищем счётчиков.

---

## 5. Acceptance Criteria

- **AC-001**: Given неавторизованный пользователь вызывает `applications.submit`, When запрос отправлен, Then tRPC возвращает код `UNAUTHORIZED`.
- **AC-002**: Given авторизованный пользователь вызывает `applications.confirmIntent` по чужой вакансии, When запрос отправлен, Then tRPC возвращает `FORBIDDEN`.
- **AC-003**: Given `vacancies.list` вызван с `specialty: 'BACKEND'`, When в БД есть 5 BACKEND вакансий и 3 FRONTEND, Then возвращаются только 5.
- **AC-004**: Given `vacancies.getById` для активной вакансии, When возвращён ответ, Then в нём отсутствуют поля `referrerName`, `referrerContact`, `referrerId`.
- **AC-005**: Given пользователь превысил rate limit `applications.submit` (5 req/мин), When отправляет 6-й запрос, Then возвращается HTTP 429.
- **AC-006**: Given `applications.getById` для реферальщика и статус заявки `SUBMITTED`, When запрос выполнен, Then поле `contactInfo` присутствует в ответе.
- **AC-007**: Given `applications.getById` для реферальщика и статус `REJECTED_BY_REFERRER` (терминальный), When запрос выполнен, Then `contactInfo` отсутствует или пустое.
- **AC-008**: Given поле `rewardKopecks = 50000n`, When `vacancies.getById` сериализует ответ, Then поле `rewardKopecks` в JSON = строка `"50000"`.

---

## 6. Test Automation Strategy

- **Unit-тесты**: каждый роутер тестируется с `createCallerFactory` (tRPC testing utils) и мок-базой.
- **Integration-тесты**: E2E запросы через `fetch` к запущенному тестовому серверу.
- **Contract-тесты**: Zod-схемы входных данных проверяются на корректных и некорректных входах.
- **Auth-тесты**: каждая процедура с auth middleware тестируется без сессии (ожидаем UNAUTHORIZED).

---

## 7. Rationale & Context

**tRPC + Next.js App Router**: нативная интеграция без дополнительной инфраструктуры. TypeScript end-to-end без кодогенерации.

**BigInt → string в JSON**: JSON.stringify не поддерживает BigInt. Используется кастомный serializer или `superjson` через tRPC transformer.

**Разделение роутеров по доменам**: `vacancies`, `applications`, `payments`, `subscriptions`, `moderation` — каждый в отдельном файле, соответствует bounded contexts.

---

## 8. Dependencies & External Integrations

- **PLT-001**: tRPC v11 — использовать только v11 API (`initTRPC`, `createCallerFactory`).
- **PLT-002**: superjson — tRPC transformer для поддержки BigInt, Date, Map в ответах.
- **PLT-003**: zod v3 — валидация входных данных всех процедур.

---

## 9. Examples & Edge Cases

### Пример: создание вакансии с guard-ами

```typescript
// server/trpc/routers/vacancies.ts (фрагмент)

export const vacanciesRouter = router({
  create: protectedProcedure
    .input(createVacancySchema)
    .mutation(async ({ ctx, input }) => {
      // Guard: не более 1 активной вакансии
      const existing = await ctx.db.vacancy.findFirst({
        where: {
          referrerId: ctx.user.id,
          status: { in: ['ACTIVE', 'FROZEN'] },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'ACTIVE_VACANCY_EXISTS',
        });
      }

      // Guard: попытки > 0
      const attempts = await getAvailableAttempts(ctx.user.id);
      if (attempts === 0) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'NO_ATTEMPTS_LEFT',
        });
      }

      return vacancyRepository.create({ ...input, referrerId: ctx.user.id });
    }),
});
```

### Edge Case: BigInt сериализация

```typescript
// lib/trpc.ts — superjson transformer
import superjson from 'superjson';

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});
// Клиент также должен использовать superjson transformer
```

---

## 10. Validation Criteria

1. `src/server/trpc/root.ts` экспортирует `appRouter` объединяющий все роутеры.
2. Каждая процедура имеет Zod-схему для `input`.
3. Ни одна процедура не возвращает поля `referrerId`, `referrerName` или `accessToken` публично.
4. REST webhook routes используют `export async function POST(req: Request)` формат Next.js Route Handler.
5. `superjson` подключён как transformer в обоих местах: сервер и клиент.

---

## 11. Related Specifications

- [spec-architecture-referi-system.md](spec-architecture-referi-system.md)
- [spec-process-application-lifecycle.md](spec-process-application-lifecycle.md)
- [spec-data-payments-escrow.md](spec-data-payments-escrow.md)
- [spec-tool-github-auth.md](spec-tool-github-auth.md)
- [spec-tool-telegram-bot.md](spec-tool-telegram-bot.md)
