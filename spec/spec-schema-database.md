---
title: Referi — Database Schema Specification
version: 1.0
date_created: 2026-04-17
owner: Referi Engineering
tags: schema, data, infrastructure
---

# Introduction

Данная спецификация описывает полную схему базы данных Referi: все таблицы (модели Prisma), поля, типы, ограничения, индексы и правила валидации. **Канонический синтаксис схемы** — файл [`prisma/schema.prisma`](../prisma/schema.prisma); строка подключения и путь миграций задаются в [`prisma.config.ts`](../prisma.config.ts) (Prisma 7). Изменения схемы сначала фиксируются здесь и в `schema.prisma`, затем миграция.

## 1. Purpose & Scope

**Назначение**: человекочитаемый контракт и чеклист сущностей; при расхождениях с `prisma/schema.prisma` приоритет у файла схемы, этот документ обновляется в той же задаче.

**Аудитория**: инженеры, AI-агенты, генерирующие миграции и репозитории.

**Допущения**:
- СУБД: PostgreSQL 16.
- ORM: Prisma 7 (`prisma` CLI, `@prisma/client`, driver adapter `pg` при необходимости).
- Все денежные суммы хранятся в копейках (`BigInt`). Значение 0 допустимо (бесплатный реферал).
- UUID v4 используется как первичный ключ для всех таблиц.
- `createdAt` / `updatedAt` проставляются автоматически через `@default(now())` и `@updatedAt`.

---

## 2. Definitions

| Термин              | Определение                                                    |
| ------------------- | -------------------------------------------------------------- |
| `kopecks`           | Целое число копеек; 100 kopecks = 1 рубль                      |
| `ApplicationStatus` | Enum всех состояний заявки                                     |
| `VacancyStatus`     | Enum статусов вакансии                                         |
| `StaffRole`         | Привилегии персонала (`MODERATOR`, `ADMIN`); не путать с актором заявки |
| `SanctionType`      | Тип санкции, наложенной на пользователя                        |
| `AttemptEvent`      | Тип события в журнале попыток реферальщика                     |
| `AuditActor`        | Кто произвёл действие (system / seeker / referrer / moderator) |

### 2.1 Защищённая оплата по заявке (`EscrowTransaction`)

`EscrowTransaction` — локальное **зеркало** состояния платежа и безопасной сделки ЮKassa по заявке. Referi не ведёт отдельный банковский эскроу-счёт: удержание и расчёты выполняет провайдер. Поля `yookassaPaymentId`, `yookassaRefundId`, `yookassaPayoutId` — ссылочные идентификаторы API. При появлении в схеме идентификатора сделки Safe deal (например `yookassaDealId`) он описывается в этом разделе и в Prisma рядом с платёжными полями.

---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: Все UUID генерируются на уровне БД через `gen_random_uuid()` (расширение `pgcrypto`).
- **REQ-002**: Все `BigInt`-поля с деньгами должны иметь CHECK constraint `>= 0`.
- **REQ-003**: Поле `ApplicationContent.bio` ограничено 1000 символами (CHECK: `char_length(bio) <= 1000`).
- **REQ-004**: Поле `ApplicationContent.coverLetter` ограничено 300 символами (CHECK: `char_length(cover_letter) <= 300`).
- **REQ-005**: `AuditLog` — таблица только для записи (append-only). Обновление и удаление строк запрещены на уровне приложения, **за исключением** каскада при безвозвратном удалении аккаунта пользователем (`deleteAccount`), когда удаляются заявки пользователя и связанные записи.
- **REQ-006**: `EscrowTransaction.amountKopecks` не может быть изменена после создания.
- **REQ-007**: Удаление аккаунта инициируется пользователем из настроек (`src/server/commands/deleteAccount.ts`); для аккаунтов с непустым `StaffRole[]` самоудаление через этот поток запрещено. Перед удалением строк выполняются синхронные платёжные действия по незавершённому эскроу/токенам и отмена известных отложенных job SLA/BullMQ.
- **CON-001**: Файлы резюме не хранятся. Поле типа `file`, `bytes`, `blob` в схеме запрещено.
- **CON-002**: Пароли не хранятся (аутентификация только через GitHub OAuth).
- **SEC-001**: Поле `SeekerSubscription.yookassaPaymentMethodId` хранит только ссылочный идентификатор ЮКассы; не хранит данные карты.
- **SEC-002**: `SubscriptionPayment.yookassaPaymentId` — уникальный идентификатор успешного платежа в ЮKassa; дубли вебхуков не создают повторных начислений периода.
- **GUD-001**: Названия таблиц в snake_case (PostgreSQL convention), модели Prisma в PascalCase.
- **GUD-002**: Внешние ключи всегда именуются `{relation}Id`.

---

## 4. Interfaces & Data Contracts

### 4.1 Полная Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // URL: prisma.config.ts → datasource.url (Prisma 7)
}

// ─────────────────────────────────────────────
// IDENTITY CONTEXT
// ─────────────────────────────────────────────

enum StaffRole {
  MODERATOR
  ADMIN
}

model User {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  displayName String
  contactInfo String?  @db.VarChar(500)
  bio         String?  @db.VarChar(1000)
  email       String?  @db.VarChar(320)
  staffRoles  StaffRole[] @default([])

  yookassaPayoutDestination String?

  githubProfile       GitHubProfile?
  seekerSubscription  SeekerSubscription?
  seekerApplications  Application[]          @relation("SeekerApplications")
  vacancies           Vacancy[]              @relation("ReferrerVacancies")
  referrerSanctions   ReferrerSanction[]
  attemptLedger       ReferrerAttemptLedger[]
  moderatorCases      ModeratorCase[]        @relation("ModeratorCases")
  abuseReportsFrom    AbuseReport[]          @relation("ReporterAbuseReports")
  vacancySearchPresets VacancySearchPreset[]

  @@map("users")
}

model VacancySearchPreset {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @db.Uuid
  name      String   @db.VarChar(80)
  /// Снимок параметров каталога (специальность, грейд, формат, зарплата, сортировка, query) без пагинации
  params    Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("vacancy_search_presets")
}

model GitHubProfile {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String   @unique @db.Uuid
  createdAt   DateTime @default(now())

  githubId          Int      @unique
  githubLogin       String
  githubCreatedAt   DateTime  // Дата создания GitHub аккаунта (из API)
  accessToken       String   // Зашифрован (AES-256)
  paidRegistration  Boolean  @default(false)  // true если аккаунт < 1 года и оплатил сбор

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("github_profiles")
}

model SeekerSubscription {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @unique @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  status             SubscriptionStatus
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  // Ссылочный ID платёжного метода в ЮКассе (не данные карты)
  yookassaPaymentMethodId String?

  subscriptionPayments SubscriptionPayment[]

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("seeker_subscriptions")
}

enum SubscriptionPaymentKind {
  INITIAL
  RENEWAL
}

model SubscriptionPayment {
  id                  String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId              String                  @db.Uuid
  yookassaPaymentId   String                  @unique
  kind                SubscriptionPaymentKind
  createdAt           DateTime                @default(now())

  seekerSubscription SeekerSubscription @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId])
  @@map("subscription_payments")
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
}

// ─────────────────────────────────────────────
// VACANCY CONTEXT
// ─────────────────────────────────────────────

enum VacancyStatus {
  ACTIVE
  FROZEN      // Заморожена из-за нарушения SLA реакции
  BLOCKED     // Заблокирована после исчерпания попыток
  DELETED     // Удалена реферальщиком или при закрытии
  CLOSED      // Успешно закрыта (оффер принят)
}

enum Specialty {
  FRONTEND
  BACKEND
  FULLSTACK
  IOS_MOBILE
  ANDROID_MOBILE
  DEVOPS
  QA
  DATA
  ML_AI
  SECURITY
  OTHER
}

enum Grade {
  JUNIOR
  MIDDLE
  SENIOR
  LEAD
  PRINCIPAL
}

enum WorkFormat {
  OFFICE
  HYBRID
  REMOTE
}

enum SalaryCurrency {
  RUB
  USD
  EUR
}

model Vacancy {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  referrerId String   @db.Uuid
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  title           String     @db.VarChar(200)
  companyName     String     @db.VarChar(200)
  specialty       Specialty
  grade           Grade
  workFormat      WorkFormat
  salaryCurrency  SalaryCurrency @default(RUB)
  salaryFromKopecks BigInt?   // NULL = не указана; минорные единицы salaryCurrency (копейки / центы); >= 0
  salaryToKopecks   BigInt?   // NULL = не указана; минорные единицы salaryCurrency; >= salaryFrom if both set
  description     String     @db.VarChar(3000)
  rewardKopecks   BigInt     @default(0)  // 0 = бесплатный реферал; >= 0

  status          VacancyStatus @default(ACTIVE)
  frozenUntil     DateTime?     // Дата разморозки (если FROZEN)
  blockedUntil    DateTime?     // Дата разблокировки (если BLOCKED)
  deletedAt       DateTime?

  // Дата первого отклика (для расчёта SLA реакции)
  firstApplicationAt DateTime?

  referrer     User          @relation("ReferrerVacancies", fields: [referrerId], references: [id])
  applications Application[]
  abuseReports AbuseReport[]

  @@index([status, specialty, grade, workFormat])
  @@index([referrerId])
  @@map("vacancies")
}

// Журнал попыток реферальщика (глобальный, не per-vacancy)
model ReferrerAttemptLedger {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  referrerId  String   @db.Uuid
  createdAt   DateTime @default(now())

  event           AttemptEvent
  applicationId   String?  @db.Uuid  // Ссылка на заявку, с которой связано событие
  regeneratesAt   DateTime?           // Когда эта попытка регенерируется (только для CONSUMED)

  referrer User @relation(fields: [referrerId], references: [id])

  @@index([referrerId, event])
  @@map("referrer_attempt_ledger")
}

enum AttemptEvent {
  CONSUMED    // Попытка потрачена (confirmReferralIntent)
  REGENERATED // Попытка восстановлена (60 дней)
  RETURNED    // Попытка возвращена (ручное удаление вакансии)
}

// ─────────────────────────────────────────────
// APPLICATION CONTEXT
// ─────────────────────────────────────────────

enum ApplicationStatus {
  SUBMITTED                  // Соискатель откликнулся
  AWAITING_PAYMENT           // Реферальщик подтвердил намерение; ждём оплату
  AWAITING_RESUME_HANDOFF    // Оплата заказчика удерживается у ЮKassa (сделка); ждём передачи резюме
  SEEKER_CANCEL_REQUESTED    // Соискатель запросил отмену; ждём подтверждения рефальщика (3 дня)
  AWAITING_COMPANY_DECISION  // Резюме передано; ждём решения компании
  OFFER_ACCEPTED             // Соискатель принял оффер
  REJECTED_BY_REFERRER       // Реферальщик отклонил
  REJECTED_BY_COMPANY        // Оба подтвердили отказ компании
  CANCELLED                  // Соискатель отозвал; или не оплатил в срок
  DISPUTED                   // Спорная ситуация (решает модератор)
  REFUNDED_BY_SLA            // Возврат по истечению SLA передачи резюме
  REFUNDED_BY_CANCEL_ACK     // Возврат после подтверждения реферальщиком отмены
  REFUNDED_BY_CANCEL_AUTO    // Возврат по истечению SLA подтверждения отмены
  REFUNDED_BY_VACANCY_DELETED // Возврат при удалении вакансии
  REFUNDED_BY_MODERATOR      // Возврат по решению модератора
}

// Терминальные (завершённые) статусы:
// OFFER_ACCEPTED, REJECTED_BY_REFERRER, REJECTED_BY_COMPANY, CANCELLED,
// REFUNDED_BY_SLA, REFUNDED_BY_CANCEL_ACK, REFUNDED_BY_CANCEL_AUTO,
// REFUNDED_BY_VACANCY_DELETED, REFUNDED_BY_MODERATOR

model Application {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  seekerId  String   @db.Uuid
  vacancyId String   @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  status    ApplicationStatus @default(SUBMITTED)

  // Дедлайны для SLA-таймеров (NULL = таймер не активен)
  paymentDeadline       DateTime?  // awaitingPayment → 5 дней
  resumeHandoffDeadline DateTime?  // awaitingResumeHandoff → 5 дней
  cancelAckDeadline     DateTime?  // seekerCancelRequested → 3 дня
  companyDecisionDeadline DateTime? // awaitingCompanyDecision → 30 дней

  // Платёжный токен разового отклика (если был куплен)
  paidApplicationTokenId String? @db.Uuid

  seeker          User                @relation("SeekerApplications", fields: [seekerId], references: [id])
  vacancy         Vacancy             @relation(fields: [vacancyId], references: [id])
  content         ApplicationContent?
  escrowTx        EscrowTransaction?
  moderatorCase   ModeratorCase?
  auditLogs       AuditLog[]

  // Уникальность: один активный отклик на вакансию
  @@unique([seekerId, vacancyId])
  @@index([vacancyId, status])
  @@index([seekerId, status])
  @@map("applications")
}

// Данные заявки: контакты, биография, cover letter
// Создаётся одновременно с Application; не изменяется после создания
model ApplicationContent {
  id            String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId String @unique @db.Uuid

  contactInfo   String  @db.VarChar(500)   // ник в мессенджере, email, ссылка
  bio           String  @db.VarChar(1000)  // Краткая биография
  coverLetter   String? @db.VarChar(300)   // Сопроводительное письмо (опционально)

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@map("application_contents")
}

// ─────────────────────────────────────────────
// PAYMENT CONTEXT (зеркало сделки / платежа ЮKassa по заявке)
// ─────────────────────────────────────────────

enum EscrowStatus {
  HELD        // Средства удерживаются у провайдера (оплата заказчика в сделке)
  CAPTURED    // Выплачено исполнителю (реферальщику) по правилам сделки
  REFUNDED    // Возвращено заказчику (соискателю)
}

model EscrowTransaction {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId String   @unique @db.Uuid
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  amountKopecks       BigInt      // Сумма вознаграждения; неизменяема после создания
  commissionKopecks   BigInt      // Комиссия маркетплейса (рассчитана при создании)
  netPayoutKopecks    BigInt      // amountKopecks - commissionKopecks

  status              EscrowStatus @default(HELD)

  // Идентификаторы в ЮKassa (сделка / платёж / возврат / выплата исполнителю)
  yookassaDealId      String?  @unique  // ID сделки Safe deal
  yookassaPaymentId   String?  @unique  // ID платежа заказчика
  yookassaRefundId    String?  @unique  // ID возврата заказчику
  yookassaPayoutId    String?  @unique  // ID выплаты исполнителю

  heldAt      DateTime?    // Время захолдирования
  capturedAt  DateTime?    // Время выплаты
  refundedAt  DateTime?    // Время возврата

  application Application @relation(fields: [applicationId], references: [id])

  @@map("escrow_transactions")
}

// Токен разового купленного отклика
model PaidApplicationToken {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  seekerId  String   @db.Uuid
  vacancyId String   @db.Uuid
  createdAt DateTime @default(now())

  amountKopecks      BigInt   // Стоимость на момент покупки
  yookassaPaymentId  String?  @unique
  expiresAt          DateTime
  paidAt             DateTime?  // Подтверждение оплаты webhook-ом
  usedAt             DateTime?  // NULL = не использован
  refundedAt         DateTime?  // Возврат при удалении вакансии

  @@index([seekerId, vacancyId])
  @@map("paid_application_tokens")
}

// Платёжная транзакция для разовой оплаты регистрации (сумма = REGISTRATION_FEE_KOP)
model RegistrationPayment {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @db.Uuid
  createdAt DateTime @default(now())

  amountKopecks      BigInt
  yookassaPaymentId  String? @unique
  paidAt             DateTime?

  @@map("registration_payments")
}

// ─────────────────────────────────────────────
// MODERATION CONTEXT
// ─────────────────────────────────────────────

enum ReferrerSanctionType {
  RESUME_HANDOFF_BAN    // Бан за не-передачу резюме (30 дней)
  REACTION_FREEZE       // Фриз новых вакансий за нарушение SLA реакции (14 дней)
}

model ReferrerSanction {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  referrerId  String   @db.Uuid
  createdAt   DateTime @default(now())

  sanctionType  ReferrerSanctionType
  reason        String               @db.VarChar(500)
  expiresAt     DateTime
  applicationId String?              @db.Uuid  // Заявка, ставшая причиной

  referrer User @relation(fields: [referrerId], references: [id])

  @@index([referrerId, expiresAt])
  @@map("referrer_sanctions")
}

enum ModeratorCaseStatus {
  OPEN
  RESOLVED_FOR_REFERRER
  RESOLVED_FOR_SEEKER
}

model ModeratorCase {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId String   @unique @db.Uuid
  moderatorId   String?  @db.Uuid  // NULL до назначения
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  status     ModeratorCaseStatus @default(OPEN)
  notes      String?             @db.VarChar(2000)
  resolvedAt DateTime?

  application Application @relation(fields: [applicationId], references: [id])
  moderator   User?        @relation("ModeratorCases", fields: [moderatorId], references: [id])

  @@map("moderator_cases")
}

enum AbuseReportReason {
  FAKE_VACANCY
  INAPPROPRIATE_BEHAVIOR
  FRAUD
  OTHER
}

model AbuseReport {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reporterId String   @db.Uuid
  vacancyId  String?  @db.Uuid
  createdAt  DateTime @default(now())

  reason     AbuseReportReason
  comment    String?           @db.VarChar(500)
  resolvedAt DateTime?
  resolution String?           @db.VarChar(500)

  reporter User     @relation("ReporterAbuseReports", fields: [reporterId], references: [id])
  vacancy  Vacancy? @relation(fields: [vacancyId], references: [id])

  @@map("abuse_reports")
}

// ─────────────────────────────────────────────
// AUDIT CONTEXT
// ─────────────────────────────────────────────

enum AuditActor {
  SYSTEM
  SEEKER
  REFERRER
  MODERATOR
  ADMIN
}

model AuditLog {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  applicationId String   @db.Uuid
  createdAt     DateTime @default(now())

  fromStatus  ApplicationStatus?
  toStatus    ApplicationStatus
  actor       AuditActor
  actorId     String?   @db.Uuid  // NULL для SYSTEM
  metadata    Json?               // Доп. данные (причина, paymentId и т.д.)

  application Application @relation(fields: [applicationId], references: [id])

  @@index([applicationId, createdAt])
  @@map("audit_logs")
}
```

DDL для PostgreSQL задаётся исходной миграцией `prisma/migrations/20260101000000_init_schema` (enum `Specialty` сразу с `IOS_MOBILE` / `ANDROID_MOBILE`, без `MOBILE`). Инкрементальные каталоги в `prisma/migrations/` не добавляются; при смене схемы локально — полный сброс и повторное применение (`prisma migrate reset` и т.п., см. `.cursor/rules/organic-redesign.mdc`).

---

## 5. Acceptance Criteria

- **AC-001**: Given схема применена к PostgreSQL, When выполнить `prisma migrate deploy`, Then все таблицы созданы без ошибок.
- **AC-002**: Given создание `ApplicationContent` с `bio` > 1000 символов, When приложение пытается сохранить запись, Then Prisma/PostgreSQL возвращает ошибку валидации до записи в БД.
- **AC-003**: Given создание `ApplicationContent` с `coverLetter` > 300 символов, When приложение пытается сохранить запись, Then Prisma/PostgreSQL возвращает ошибку валидации.
- **AC-004**: Given попытка обновить поле `EscrowTransaction.amountKopecks` через `applicationRepository`, When код пытается изменить сумму, Then repository возбрасывает ошибку (guard на уровне кода).
- **AC-005**: Given запрос `applicationRepository.findActiveBySeeker(seekerId)`, When у соискателя 2 заявки в статусе `SUBMITTED`, Then метод возвращает 2 записи (только нетерминальные статусы).
- **AC-006**: Given событие в `AuditLog`, When запись создана, Then ни один метод репозитория не позволяет её обновить или удалить.
- **AC-007**: Given два одновременных вызова `confirmReferralIntent` для одной заявки (гонка), When оба попадают в `SELECT ... FOR UPDATE`, Then только один успешно завершается, второй получает ошибку `APPLICATION_WRONG_STATUS`.

---

## 6. Test Automation Strategy

- **Integration-тесты на схему**: использовать testcontainers (PostgreSQL) + `prisma migrate dev`. Тест на создание всех моделей, уникальных ограничений, каскадных удалений.
- **Seed-данные**: `prisma/seed.ts` создаёт тестовые данные для разработки: 3 пользователя, 2 вакансии, 3 заявки в разных статусах.
- **Migration naming convention**: `YYYYMMDD_description.sql`.

---

## 7. Rationale & Context

**BigInt для денег**: избегает проблем с `Number.MAX_SAFE_INTEGER` при работе с суммами в копейках. Prisma возвращает `BigInt` — при сериализации в JSON нужно конвертировать в строку.

**Денормализованные deadline-поля в Application**: упрощают BullMQ-запросы — воркер при пробуждении просто проверяет `deadline < now()` вместо пересчёта.

**Append-only AuditLog**: обеспечивает полную историю переходов состояний для разрешения споров. Отдельная таблица (не поле `history` в JSON) обеспечивает индексируемость.

**UUIDv4 как PK**: избегает предсказуемых последовательных ID (безопасность), работает в распределённых средах.

---

## 8. Dependencies & External Integrations

- **INF-001**: PostgreSQL 16 с расширением `pgcrypto` (для `gen_random_uuid()`).
- **PLT-001**: Prisma 7 — схема в `prisma/schema.prisma`, конфиг в `prisma.config.ts`.

---

## 9. Examples & Edge Cases

### Подсчёт активных откликов соискателя

```typescript
// src/server/repositories/applicationRepository.ts

const ACTIVE_STATUSES: ApplicationStatus[] = [
  'SUBMITTED',
  'AWAITING_PAYMENT',
  'AWAITING_RESUME_HANDOFF',
  'SEEKER_CANCEL_REQUESTED',
  'AWAITING_COMPANY_DECISION',
  'DISPUTED',
];

async function countActiveApplicationsBySeeker(seekerId: string): Promise<number> {
  return prisma.application.count({
    where: { seekerId, status: { in: ACTIVE_STATUSES } },
  });
}
```

### Получение доступного пула попыток реферальщика

```typescript
// src/server/repositories/referrerAttemptRepository.ts
const MAX_ATTEMPTS = 3; // из src/shared/constants/businessRules.ts

async function getAvailableAttempts(referrerId: string): Promise<number> {
  const consumed = await prisma.referrerAttemptLedger.count({
    where: {
      referrerId,
      event: 'CONSUMED',
      // Попытка ещё не регенерирована (regeneratesAt в будущем или регенерации не было)
      OR: [
        { regeneratesAt: { gt: new Date() } },
        { regeneratesAt: null },
      ],
    },
  });
  // Учесть RETURNED события (возврат при ручном удалении вакансии)
  const returned = await prisma.referrerAttemptLedger.count({
    where: { referrerId, event: 'RETURNED' },
  });
  // Грубо: available = MAX - consumed + returned
  // Детальный подсчёт — через LEFT JOIN на CONSUMED/REGENERATED пары
  return Math.max(0, MAX_ATTEMPTS - consumed + returned);
}
```

### Edge Case: вакансия удаляется пока заявка в DISPUTED

Если заявка находится в `DISPUTED` — вакансия **не может быть удалена** реферальщиком вручную (кнопка заблокирована). Удаление разрешено только после завершения спора модератором.

---

## 10. Validation Criteria

1. `prisma validate` завершается без ошибок.
2. `prisma migrate dev` применяется к чистой PostgreSQL без конфликтов.
3. Все поля с деньгами имеют тип `BigInt`.
4. В схеме нет полей типа `Bytes`, `LargeBinary` или любых файловых хранилищ.
5. Таблица `audit_logs` не имеет `@updatedAt` (append-only).
6. Все enum-значения `ApplicationStatus` соответствуют списку в спецификации машины состояний.

---

## 11. Related Specifications

- [spec-process-application-lifecycle.md](spec-process-application-lifecycle.md) — использует `ApplicationStatus`
- [spec-process-referrer-sla.md](spec-process-referrer-sla.md) — использует `ReferrerSanction`, `ReferrerAttemptLedger`
- [spec-data-payments-escrow.md](spec-data-payments-escrow.md) — использует `EscrowTransaction`
- [spec-architecture-referi-system.md](spec-architecture-referi-system.md) — общий контекст
