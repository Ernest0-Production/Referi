---

## title: Referi — API Design Specification (tRPC + REST Webhooks)
version: 1.0
date_created: 2026-04-17
owner: Referi Engineering
tags: design, architecture, app

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


| Термин         | Определение                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Query**      | tRPC процедура для чтения данных (GET-семантика)                                          |
| **Mutation**   | tRPC процедура для записи/изменения данных (POST-семантика)                               |
| **Middleware** | tRPC middleware для проверки прав (isAuth, isModerator)                                   |
| **Zod schema** | TypeScript-схема валидации входных данных                                                 |
| **ctx**        | Базовый context: `{ session, db, ip }`; после `protectedProcedure` — ещё `userId: string` |


---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Каждая процедура валидирует input через Zod-схему.
- **REQ-002**: Проверка сессии и ролей модератора — через tRPC middleware (`protectedProcedure`, `moderatorProcedure` в `src/server/trpc/trpc.ts`). Доменные guard-ы (владелец вакансии, статус заявки) остаются в процедурах или в `src/server/commands/`*.
- **REQ-003**: Все денежные поля в ответах API (kopecks) сериализуются как строки (`string`) из-за ограничений JSON и BigInt.
- **REQ-004**: Процедуры чтения (`query`) не должны менять состояние системы.
- **REQ-005**: REST-вебхуки (`/api/webhooks/`*) не используют tRPC; обрабатываются напрямую в Next.js Route Handlers.
- **SEC-001**: tRPC context проверяет наличие валидной сессии Auth.js для всех non-public процедур.
- **SEC-002**: Rate limits (опционально): Redis sliding-window в `[src/lib/rateLimiter.ts](../src/lib/rateLimiter.ts)`, вызов из `[src/app/api/trpc/[trpc]/route.ts](../src/app/api/trpc/%5Btrpc%5D/route.ts)` при `FEATURE_RATE_LIMITING=true`.
- **GUD-001**: Названия процедур в camelCase; формат `{resource}.{action}` (например: `vacancies.list`, `applications.submit`).

---

## 4. Interfaces & Data Contracts

### 4.1 tRPC context и middleware

Файлы: `[src/server/trpc/context.ts](../src/server/trpc/context.ts)` (создание context), `[src/server/trpc/trpc.ts](../src/server/trpc/trpc.ts)` (`protectedProcedure`, `moderatorProcedure`, superjson).

```typescript
// src/server/trpc/context.ts
export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const session = await auth();
  const ip =
    opts.req.headers.get("x-forwarded-for") ?? opts.req.headers.get("x-real-ip") ?? "unknown";
  return { db: prisma, ip, session };
}
export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// src/server/trpc/trpc.ts — фрагмент
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id } });
});
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceUserIsModerator = t.middleware(async ({ ctx, next }) => {
  // … загрузка staffRoles из БД …
  if (!user?.staffRoles.includes("MODERATOR") && !user?.staffRoles.includes("ADMIN"))
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, session: ctx.session, userId: ctx.session.user.id } });
});
export const moderatorProcedure = t.procedure.use(enforceUserIsModerator);
```

Отдельного файла `middleware.ts` нет; проверка прав реферальщика по `vacancyId` выполняется внутри соответствующих процедур.

### 4.2 Router: `auth`


| Процедура                          | Тип      | Auth   | Входные данные                        | Описание                                                                                                                                                                                   |
| ---------------------------------- | -------- | ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth.me`                          | query    | isAuth | —                                     | Текущий пользователь + профиль + `staffRoles` (MODERATOR/ADMIN); объект `subscription` (если есть): период, статус, `autoRenewEnabled` для автопродления при `ACTIVE`; `availableAttempts` |
| `auth.updateProfile`               | mutation | isAuth | `{ displayName, contactInfo?, bio? }` | Обновить профиль пользователя                                                                                                                                                              |
| `auth.initiateRegistrationPayment` | mutation | public | `{ userId }`                          | Создать платёж за регистрацию (молодой GitHub); сумма — `BUSINESS_RULES.REGISTRATION_FEE_KOP`; `confirmationUrl`                                                                           |


### 4.3 Router: `vacancies`


| Процедура              | Тип      | Auth   | Входные данные                                                                                                                                        | Описание                                                                                                                                                                                                                                                         |
| ---------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vacancies.list`       | query    | public | `{ specialty?: Specialty[], grade?: Grade[], workFormat?: WorkFormat[], salaryCurrency?: SalaryCurrency, salaryFrom?, query?, sort?, page?, limit? }` | Лента активных вакансий с фильтрами; при `salaryFrom` без `salaryCurrency` подразумевается `RUB`; нижняя граница сравнивается только с вакансиями в выбранной валюте; сортировка `salary_desc` по сырым минорным суммам — при смешанных валютах порядок условный |
| `vacancies.getById`    | query    | public | `{ id }`                                                                                                                                              | Детальная страница вакансии (без данных реферальщика)                                                                                                                                                                                                            |
| `vacancies.create`     | mutation | isAuth | `{ title, companyName, specialty, grade, workFormat, salaryCurrency?, salaryFrom?, salaryTo?, description, rewardKopecks }`                           | Создать вакансию; guard: 1 активная вакансия, пул попыток > 0                                                                                                                                                                                                    |
| `vacancies.delete`     | mutation | isAuth | `{ id }`                                                                                                                                              | Удалить вакансию; cascade refund                                                                                                                                                                                                                                 |
| `vacancies.myActive`   | query    | isAuth | —                                                                                                                                                     | Активная вакансия текущего реферальщика                                                                                                                                                                                                                          |
| `vacancies.applicants` | query    | isAuth | `{ vacancyId }`                                                                                                                                       | Список заявок на вою вакансию (только контакты, bio, cover)                                                                                                                                                                                                      |


**Схема ответа `vacancies.list`** (элемент):

```typescript
type VacancyListItem = {
  id: string;
  title: string;
  companyName: string;
  specialty: Specialty;
  grade: Grade;
  workFormat: WorkFormat;
  salaryCurrency: "RUB" | "USD" | "EUR";
  salaryFromKopecks: string | null;  // BigInt → string; минорные единицы salaryCurrency
  salaryToKopecks: string | null;
  rewardKopecks: string;
  description: string;
  applicationCount: number;  // число заявок (Application) по вакансии
  createdAt: string;  // ISO 8601
  // Имя/контакты реферальщика НЕ возвращаются
};
```

Ответ `vacancies.getById` для активной вакансии содержит тот же состав полей, что элемент ленты (включая `applicationCount`).

### 4.4 Router: `applications`


| Процедура                        | Тип      | Auth   | Входные данные                                                | Описание                                                             |
| -------------------------------- | -------- | ------ | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `applications.submit`            | mutation | isAuth | `{ vacancyId, contactInfo, bio, coverLetter?, paidTokenId? }` | Откликнуться; guard: лимиты, статус вакансии                         |
| `applications.cancel`            | mutation | isAuth | `{ applicationId }`                                           | Отозвать отклик (SUBMITTED / AWAITING_PAYMENT)                       |
| `applications.requestCancel`     | mutation | isAuth | `{ applicationId }`                                           | Запросить отмену (AWAITING_RESUME_HANDOFF)                           |
| `applications.myList`            | query    | isAuth | `{ status? }`                                                 | Мои заявки как соискателя                                            |
| `applications.activeVacancyIds`  | query    | isAuth | —                                                             | `vacancyId[]` с незавершёнными заявками текущего соискателя (лимиты) |
| `applications.getById`           | query    | isAuth | `{ applicationId }`                                           | Детали заявки (для соискателя или реферальщика)                      |
| `applications.confirmIntent`     | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: подтвердить намерение рефералить                        |
| `applications.reject`            | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: отклонить кандидата                                     |
| `applications.acknowledgeCancel` | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: подтвердить запрос отмены соискателя                    |
| `applications.confirmHandoff`    | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: подтвердить передачу резюме HR                          |
| `applications.acceptOffer`       | mutation | isAuth | `{ applicationId }`                                           | Соискатель: принял оффер                                             |
| `applications.reportRejection`   | mutation | isAuth | `{ applicationId }`                                           | Соискатель: получил отказ компании                                   |
| `applications.confirmRejection`  | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: подтвердить отказ компании                              |
| `applications.denyRejection`     | mutation | isAuth | `{ applicationId }`                                           | Реферальщик: опровергнуть отказ компании (→ disputed)                |
| `applications.getAuditLog`       | query    | isAuth | `{ applicationId }`                                           | История переходов состояний (только для участников или модераторов)  |


**Правила видимости данных в `applications.getById`**:

- Соискатель видит: всё своё содержимое + статус + deadline-даты.
- Реферальщик видит: `contactInfo`, `bio`, `coverLetter`, `status`, `displayName` соискателя (если заявка в активном статусе).
- Реферальщик НЕ видит данные по заявке после перехода в терминальное состояние (кроме `OFFER_ACCEPTED` — виден результат).

### 4.5 Router: `payments`


| Процедура                               | Тип      | Auth   | Входные данные      | Описание                                                                                                                                              |
| --------------------------------------- | -------- | ------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payments.initiateEscrow`               | mutation | isAuth | `{ applicationId }` | Инициировать оплату соискателя по заявке (`AWAITING_PAYMENT`) через Safe deal; возвращает `{ confirmationUrl?, paymentId?, dealId?, amountKopecks? }` |
| `payments.initiatePaidApplicationToken` | mutation | isAuth | `{ vacancyId }`     | Купить разовый токен отклика; возвращает `{ confirmationUrl, paymentId, tokenId }`                                                                    |
| `payments.escrowStatus`                 | query    | isAuth | `{ applicationId }` | Зеркало `EscrowTransaction` для участников заявки (`paymentId`, суммы, даты)                                                                          |


Токен оплачивается отдельной процедурой `payments.initiatePaidApplicationToken`; после webhook `payment.succeeded` запись `PaidApplicationToken.paidAt` заполняется и токен может быть использован в `applications.submit`.

### 4.6 Router: `subscriptions`


| Процедура                   | Тип      | Auth   | Входные данные | Описание                                                                                                    |
| --------------------------- | -------- | ------ | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `subscriptions.me`          | query    | isAuth | —              | Текущая подписка (период, статус, `autoRenewEnabled` — автопродление для статуса `ACTIVE`)                  |
| `subscriptions.initiatePro` | mutation | isAuth | —              | Оплата подписки «Соискатель PRO»; `confirmationUrl` (блокируется, если уже есть активный оплаченный период) |
| `subscriptions.cancel`      | mutation | isAuth | —              | Отменить подписку PRO (лимит откликов 2 для новых заявок; автоплатежи прекращаются)                         |


### 4.7 Router: `moderation` (только MODERATOR / ADMIN)


| Процедура                       | Тип      | Auth        | Входные данные                                        | Описание                                                                                      |
| ------------------------------- | -------- | ----------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `moderation.openCases`          | query    | isModerator | —                                                     | Список открытых споров                                                                        |
| `moderation.getCaseById`        | query    | isModerator | `{ caseId }`                                          | Детали спора + история заявки                                                                 |
| `moderation.resolveForReferrer` | mutation | isModerator | `{ caseId, notes? }`                                  | Решение в пользу реферальщика                                                                 |
| `moderation.resolveForSeeker`   | mutation | isModerator | `{ caseId, notes? }`                                  | Решение в пользу соискателя                                                                   |
| `moderation.abuseReports`       | query    | isModerator | `{ status? }`                                         | Список жалоб                                                                                  |
| `moderation.resolveAbuseReport` | mutation | isModerator | `{ reportId, resolution, blockUser?, blockVacancy? }` | Разрешить жалобу; при `blockVacancy: true` и привязанной вакансии — статус вакансии `BLOCKED` |
| `moderation.blockUser`          | mutation | isModerator | `{ userId, reason, expiresAt }`                       | Санкция на реферальщика (`ReferrerSanction`)                                                  |


### 4.8 Router: `reports` (жалобы, публичный)


| Процедура                   | Тип      | Auth   | Входные данные                     | Описание         |
| --------------------------- | -------- | ------ | ---------------------------------- | ---------------- |
| `reports.submitAbuseReport` | mutation | isAuth | `{ vacancyId?, reason, comment? }` | Отправить жалобу |


### 4.9 REST Webhook Routes


| Путь                      | Метод    | Описание                                  |
| ------------------------- | -------- | ----------------------------------------- |
| `/api/webhooks/yookassa`  | POST     | Входящие события ЮKassa (платежи, сделки) |
| `/api/auth/[...nextauth]` | GET/POST | Auth.js handler                           |


**Верификация `/api/webhooks/yookassa`**:

```
Header: Authorization: Basic {base64(shopId:secretKey)}
или
Проверка HMAC-SHA256 тела запроса с секретом (альтернатива в спецификации провайдера).
```

### 4.10 Rate Limits

Включение: `**FEATURE_RATE_LIMITING=true**`. Реализация: Redis в `[src/lib/rateLimiter.ts](../src/lib/rateLimiter.ts)`, проверка в `[src/app/api/trpc/[trpc]/route.ts](../src/app/api/trpc/%5Btrpc%5D/route.ts)` (Node runtime, не Edge).


| Ключ в коде (`RATE_LIMIT_RULES`) | Условие             | Лимит (текущая реализация)     |
| -------------------------------- | ------------------- | ------------------------------ |
| `publicApi`                      | Нет сессии          | 60 запросов / 60 с / IP        |
| `authedApi`                      | Есть `session.user` | 120 запросов / 60 с / `userId` |


При превышении — **HTTP 429**, JSON `{ error, retryAfter }`, заголовки `Retry-After`, `X-RateLimit-Remaining`.

Отдельных лимитов на `applications.submit` и `reports.submitAbuseReport` в коде нет.


| Вебхуки | Политика                                                             |
| ------- | -------------------------------------------------------------------- |
| ЮKassa  | Не проходит через общий tRPC rate-limit handler; защита — Basic Auth |


---

## 5. Acceptance Criteria

- **AC-001**: Given неавторизованный пользователь вызывает `applications.submit`, When запрос отправлен, Then tRPC возвращает код `UNAUTHORIZED`.
- **AC-002**: Given авторизованный пользователь вызывает `applications.confirmIntent` по чужой вакансии, When запрос отправлен, Then tRPC возвращает `FORBIDDEN`.
- **AC-003**: Given `vacancies.list` вызван с `specialty: ['BACKEND']`, When в БД есть 5 BACKEND вакансий и 3 FRONTEND, Then возвращаются только 5.
- **AC-004**: Given `vacancies.getById` для активной вакансии, When возвращён ответ, Then в нём отсутствуют поля `referrerName`, `referrerContact`, `referrerId`.
- **AC-005**: Given включён `FEATURE_RATE_LIMITING`, авторизованный пользователь исчерпал лимит `authedApi` (120 запросов за 60 с к `/api/trpc`), When отправляет следующий запрос, Then HTTP 429 и заголовок `Retry-After`.
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

**Разделение роутеров по доменам**: `vacancies`, `applications`, `payments`, `subscriptions`, `moderation`, `reports` — в `[src/server/trpc/root.ts](../src/server/trpc/root.ts)`; `reports` — отдельный роутер для жалоб.

---

## 8. Dependencies & External Integrations

- **PLT-001**: tRPC v11 — использовать только v11 API (`initTRPC`, `createCallerFactory`).
- **PLT-002**: superjson — tRPC transformer для поддержки BigInt, Date, Map в ответах.
- **PLT-003**: zod v3 — валидация входных данных всех процедур.

---

## 9. Examples & Edge Cases

### Пример: создание вакансии с guard-ами

```typescript
// src/server/trpc/routers/vacancies.ts (фрагмент)

export const vacanciesRouter = router({
  create: protectedProcedure
    .input(createVacancySchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const existing = await ctx.db.vacancy.findFirst({
        where: { referrerId: userId, status: { in: ["ACTIVE", "FROZEN"] } },
      });
      if (existing) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ACTIVE_VACANCY_EXISTS",
        });
      }
      // … NO_ATTEMPTS_LEFT, создание записи …
    }),
});
```

### Edge Case: BigInt сериализация

```typescript
// src/server/trpc/trpc.ts — superjson transformer
import superjson from "superjson";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  // …
});
// Клиент tRPC также использует superjson transformer
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
- [spec-moderation-contact.md](spec-moderation-contact.md) — публичная ссылка контакта модерации в UI

