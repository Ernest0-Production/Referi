---
title: Referi — Payments & Escrow Specification
version: 1.0
date_created: 2026-04-17
owner: Referi Engineering
tags: data, infrastructure, process
---

# Introduction

Данная спецификация описывает абстракцию `PaymentProvider`, все денежные потоки через эскроу-механизм Referi, правила идемпотентности, схему webhook-событий ЮКассы и алгоритм расчёта комиссии.

## 1. Purpose & Scope

**Назначение**: определить контракты платёжного уровня приложения так, чтобы конкретный провайдер (ЮКасса) мог быть заменён без изменения бизнес-логики.

**Аудитория**: инженеры, AI-агенты, QA.

**Допущения**:
- Первичный и единственный провайдер в v1.0 — **ЮКасса** (платёжный шлюз + выплаты).
- В тестовом окружении используется `MockPaymentProvider` с тем же интерфейсом.
- Все суммы передаются в **копейках** (`bigint`). Конвертация в рубли — только в слое представления.
- ЮКасса работает по модели «холд + подтверждение» (`capture`): деньги сначала блокируются, потом фактически списываются.

---

## 2. Definitions

| Термин              | Определение                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Холд (Hold)**     | Блокировка суммы на карте плательщика без фактического списания                       |
| **Capture**         | Фактическое списание захолдированной суммы                                            |
| **Refund**          | Возврат списанной (или захолдированной) суммы на карту                                |
| **Payout**          | Выплата средств на банковскую карту реферальщика                                      |
| **Escrow**          | Средства, захолдированные на стороне Referi до выполнения условий                     |
| **Idempotency Key** | Уникальный ключ запроса; повторный запрос с тем же ключом возвращает тот же результат |
| **Webhook**         | HTTP POST-уведомление от ЮКассы об изменении статуса платежа                          |
| **netPayout**       | Сумма выплаты реферальщику: `amount - commission`                                     |

---

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `PaymentProvider` — TypeScript-интерфейс. Все операции с деньгами идут только через него.
- **REQ-002**: Каждый вызов `PaymentProvider` должен сопровождаться уникальным `idempotencyKey` в формате `{operation}:{entityId}:{attemptNumber}`.
- **REQ-003**: `EscrowTransaction.amountKopecks` устанавливается при создании и не изменяется.
- **REQ-004**: `capture` и `payout` должны выполняться только если `EscrowTransaction.status = HELD`.
- **REQ-005**: `refund` должен выполняться только если `EscrowTransaction.status = HELD` (не `CAPTURED`).
- **REQ-006**: Webhook-обработчик возвращает HTTP 200 OK даже при повторном получении уже обработанного события (идемпотентность).
- **REQ-007**: Комиссия сервиса рассчитывается по формуле: `commission = floor(amount * PLATFORM_COMMISSION_RATE)`. Округление — вниз (в пользу реферальщика).
- **CON-001**: Referi не хранит данные банковских карт. Карта реферальщика для выплат хранится в ЮКасса; Referi хранит только `savedPaymentMethodId`.
- **CON-002**: Выплата реферальщику (`payout`) невозможна без предварительно добавленной карты. Реферальщик обязан добавить карту для выплат до получения первого вознаграждения.
- **SEC-001**: Webhook-запросы от ЮКассы должны верифицироваться по HMAC-SHA256 подписи в заголовке `Authorization`.
- **GUD-001**: Все платёжные операции оборачиваются в try/catch; при ошибке создаётся BullMQ retry job.

---

## 4. Interfaces & Data Contracts

### 4.1 Интерфейс PaymentProvider

```typescript
// server/services/paymentService.ts

export interface CreatePaymentOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  metadata: {
    applicationId: string;
    seekerId: string;
  };
  capture: false;  // Всегда false для hold
  returnUrl: string;  // URL редиректа после оплаты
}

export interface CreatePaymentResult {
  paymentId: string;
  confirmationUrl: string;  // Страница оплаты ЮКасса
  status: 'pending';
}

export interface CaptureOptions {
  idempotencyKey: string;
  paymentId: string;
  amountKopecks: bigint;
}

export interface RefundOptions {
  idempotencyKey: string;
  paymentId: string;
  amountKopecks: bigint;
  description: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending';
}

export interface PayoutOptions {
  idempotencyKey: string;
  amountKopecks: bigint;
  description: string;
  savedPaymentMethodId: string;  // ID карты в ЮКасса
  metadata: { referrerId: string; applicationId: string };
}

export interface PayoutResult {
  payoutId: string;
  status: 'pending' | 'succeeded';
}

export interface PaymentProvider {
  /**
   * Создаёт платёж с холдом (capture=false).
   * Возвращает URL для перехода пользователя на страницу оплаты.
   */
  createPayment(options: CreatePaymentOptions): Promise<CreatePaymentResult>;

  /**
   * Подтверждает (списывает) ранее захолдированный платёж.
   * Вызывается при OFFER_ACCEPTED или решении модератора в пользу реферальщика.
   */
  capturePayment(options: CaptureOptions): Promise<void>;

  /**
   * Возвращает захолдированные или списанные средства соискателю.
   * Вызывается при различных сценариях возврата.
   */
  refundPayment(options: RefundOptions): Promise<RefundResult>;

  /**
   * Выплачивает средства на сохранённую карту реферальщика.
   * Вызывается после capture.
   */
  createPayout(options: PayoutOptions): Promise<PayoutResult>;

  /**
   * Проверяет актуальный статус платежа в ЮКасса (polling fallback).
   */
  getPaymentStatus(paymentId: string): Promise<'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'>;
}
```

### 4.2 Полный денежный поток (эскроу)

```
Сценарий A: Успешный оффер

  Seeker → createPayment(amount, capture=false)
    └──→ ЮКасса: холд amount на карте seeker
    └──→ webhook: payment.succeeded (статус = waiting_for_capture)
    └──→ EscrowTransaction { status: HELD, yookassaPaymentId }
    └──→ Application: AWAITING_RESUME_HANDOFF

  Seeker nажал "Принял оффер"
    └──→ seekerAcceptsOffer()
    └──→ capturePayment(paymentId, amount)
          └──→ ЮКасса: списание amount
          └──→ webhook: payment.succeeded (статус = succeeded)
    └──→ commission = floor(amount * 0.10)
    └──→ netPayout = amount - commission
    └──→ createPayout(netPayout, referrer.savedPaymentMethodId)
          └──→ ЮКасса Payout API: перевод на карту реферальщика
    └──→ EscrowTransaction { status: CAPTURED }
    └──→ Application: OFFER_ACCEPTED
    └──→ Vacancy: DELETED

Сценарий B: Возврат (SLA, cancel, модератор)

  Событие возврата:
    └──→ refundPayment(paymentId, amount)
          └──→ ЮКасса: разморозка холда / возврат
          └──→ webhook: refund.succeeded
    └──→ EscrowTransaction { status: REFUNDED }
    └──→ Application: соответствующий REFUNDED_* статус

Сценарий C: Бесплатный реферал (amount = 0)

  referrerConfirmIntent() → Application: AWAITING_PAYMENT
    └──→ System auto: escrowHoldSucceeded() без реального платежа
    └──→ EscrowTransaction НЕ создаётся
    └──→ Application: AWAITING_RESUME_HANDOFF

  При OFFER_ACCEPTED:
    └──→ EscrowTransaction отсутствует → capture/payout пропускается
    └──→ Application: OFFER_ACCEPTED
    └──→ Vacancy: DELETED
```

### 4.3 Webhook-события ЮКассы

| Событие                       | Триггер                             | Действие в системе                                |
| ----------------------------- | ----------------------------------- | ------------------------------------------------- |
| `payment.waiting_for_capture` | Пользователь успешно оплатил (холд) | `escrowHoldSucceeded(applicationId)`              |
| `payment.succeeded`           | `capturePayment` подтверждён        | Обновить `EscrowTransaction.capturedAt`           |
| `payment.canceled`            | Платёж отменён или истёк            | `paymentDeadlineExpired(applicationId)`           |
| `refund.succeeded`            | Возврат выполнен                    | Обновить `EscrowTransaction.refundedAt`           |
| `payout.succeeded`            | Выплата реферальщику выполнена      | Обновить `EscrowTransaction.payoutId` + уведомить |
| `payout.canceled`             | Выплата не выполнена                | Создать retry job; уведомить модератора           |

### 4.4 Обработка webhook (псевдокод)

```typescript
// app/api/webhooks/yookassa/route.ts

export async function POST(request: Request) {
  // 1. Верификация подписи
  const body = await request.text();
  const authHeader = request.headers.get('Authorization');
  if (!verifyYookassaSignature(body, authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Парсинг события
  const event = JSON.parse(body) as YookassaWebhookEvent;

  // 3. Идемпотентность: проверить, не обрабатывали ли уже
  const alreadyProcessed = await isWebhookProcessed(event.object.id, event.event);
  if (alreadyProcessed) {
    return new Response('OK', { status: 200 });  // Идемпотентно
  }

  // 4. Поставить в очередь обработки (не блокируем webhook)
  await paymentWorkerQueue.add('handle-webhook', { event }, {
    jobId: `webhook:${event.event}:${event.object.id}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
  });

  return new Response('OK', { status: 200 });
}
```

### 4.5 Расчёт комиссии

```typescript
// shared/utils/money.ts

export function calculateCommission(amountKopecks: bigint): {
  commission: bigint;
  netPayout: bigint;
} {
  const RATE = BigInt(Math.round(BUSINESS_RULES.PLATFORM_COMMISSION_RATE * 10000)); // 1000 = 10%
  const commission = (amountKopecks * RATE) / BigInt(10000);  // floor деления
  const netPayout = amountKopecks - commission;
  return { commission, netPayout };
}

// Пример:
// amount = 10_000_00 (100 000 ₽)
// commission = 10_000_00 * 1000 / 10000 = 1_000_00 (10 000 ₽)
// netPayout = 9_000_00 (90 000 ₽)
```

### 4.6 Polling fallback при задержке webhook

```typescript
// server/workers/paymentWorker.ts

// При создании платежа запланировать polling job
async function schedulePaymentPolling(applicationId: string, paymentId: string) {
  await paymentPollingQueue.add('poll-payment', { applicationId, paymentId }, {
    jobId: `poll:${paymentId}`,
    delay: 5 * 60 * 1000,  // Первая проверка через 5 минут
    attempts: 12,           // Итого ~1 час
    backoff: { type: 'fixed', delay: 5 * 60 * 1000 },
  });
}

// Если webhook пришёл раньше — отменить polling job
async function cancelPollingJob(paymentId: string) {
  const job = await paymentPollingQueue.getJob(`poll:${paymentId}`);
  if (job) await job.remove();
}
```

---

## 5. Acceptance Criteria

- **AC-001**: Given вызов `createPayment` с одним `idempotencyKey` дважды, When второй вызов приходит, Then возвращается тот же `paymentId` без создания нового платежа в ЮКасса.
- **AC-002**: Given webhook `payment.waiting_for_capture` для `applicationId`, When он получен, Then `EscrowTransaction` создаётся со статусом `HELD` и `Application` переходит в `AWAITING_RESUME_HANDOFF`.
- **AC-003**: Given тот же webhook получен повторно, When обработчик проверяет идемпотентность, Then возвращает 200 OK без повторного изменения БД.
- **AC-004**: Given `seekerAcceptsOffer` вызван, When `EscrowTransaction.status = HELD`, Then последовательно выполняются `capturePayment` и `createPayout`; `EscrowTransaction.status = CAPTURED`.
- **AC-005**: Given вебхук с невалидной подписью, When система его получает, Then возвращает 401 и не изменяет БД.
- **AC-006**: Given `rewardKopecks = 0` для вакансии, When вызывается `escrowHoldSucceeded`, Then `EscrowTransaction` не создаётся и `capture`/`payout` не вызываются при `offerAccepted`.
- **AC-007**: Given `payout.canceled` webhook получен, When система обрабатывает его, Then создаётся retry BullMQ job и уведомляется модератор.
- **AC-008**: Given `calculateCommission(10_000_00n)`, When вычисляется, Then `commission = 1_000_00n` и `netPayout = 9_000_00n`.

---

## 6. Test Automation Strategy

- **Unit-тесты**: `MockPaymentProvider` реализует тот же интерфейс; все команды тестируются с мок-провайдером.
- **Integration-тесты**: использовать тестовую среду ЮКасса (sandbox) для проверки реального flow (опционально в CI).
- **Webhook-тесты**: генерация валидных и невалидных подписей; проверка идемпотентности при повторном получении.
- **Money-тесты**: `calculateCommission` тестируется на граничных значениях (0, 1 коп., MaxBigInt).

---

## 7. Rationale & Context

**`capture=false` при создании платежа**: двухшаговая схема (холд → подтверждение) защищает соискателя. Деньги не списываются сразу; они возвращаются если реферальщик не выполнил обязательство.

**Webhook в очередь**: вебхук обрабатывается асинхронно через BullMQ с retry. Это предотвращает потерю событий при временных ошибках БД.

**Абстракция PaymentProvider**: позволит при необходимости перейти на другой шлюз (Т-Касса, CloudPayments) без изменения бизнес-логики.

**BigInt везде**: JavaScript `number` не точен для чисел > 2^53. Суммы реферальных вознаграждений могут быть большими (% от зарплаты).

---

## 8. Dependencies & External Integrations

- **SVC-001**: ЮКасса Payments API v3 — создание, подтверждение, возврат платежей. Endpoint: `https://api.yookassa.ru/v3/payments`.
- **SVC-002**: ЮКасса Payouts API — выплаты физлицам. Требует отдельного подключения и верификации у ЮКасса.
- **INF-002**: Redis + BullMQ — очередь обработки webhook-событий.

---

## 9. Examples & Edge Cases

### Edge Case: Capture после ручного удаления вакансии

```
Хронология:
  T0: seekerAcceptsOffer() — инициирован capture
  T1: capturePayment() — запрос отправлен в ЮКасса
  T2: Referrer удаляет вакансию (одновременно с T1, до получения результата)

Ожидаемое поведение:
  - Транзакция Prisma в T2 проверяет Application.status = OFFER_ACCEPTED
  - OFFER_ACCEPTED — терминальный статус → vacancyDeletedCascade не трогает эту заявку
  - Capture завершается успешно; выплата производится
  - Вакансия уже удалена (DELETED) — нет двойного удаления
```

### Edge Case: Частичный возврат

```
Рефери «Соискатель PRO» заплатил за отклик 50 000 ₽ = 5_000_000 коп.
Возврат полной суммы:
  refundPayment(paymentId, 5_000_000n)

Комиссия при возврате НЕ взимается:
  refundAmount = amountKopecks (полный возврат в любом случае)
```

---

## 10. Validation Criteria

1. `server/services/paymentService.ts` экспортирует `PaymentProvider` интерфейс и `YookassaPaymentProvider` реализацию.
2. `server/services/paymentService.ts` экспортирует `MockPaymentProvider` для тестов.
3. Ни один файл вне `paymentService.ts` не импортирует ЮКасса SDK напрямую.
4. Все вызовы `createPayment`, `capturePayment`, `refundPayment`, `createPayout` содержат `idempotencyKey`.
5. `calculateCommission` покрыт unit-тестами.
6. Вебхук-роут имеет тест на невалидную подпись (ожидает 401).

---

## 11. Related Specifications

- [spec-process-application-lifecycle.md](spec-process-application-lifecycle.md) — денежные операции как side effects переходов
- [spec-schema-database.md](spec-schema-database.md) — `EscrowTransaction`
- [spec-design-api.md](spec-design-api.md) — вебхук роут `/api/webhooks/yookassa`
