# Referi

Next.js-приложение: Prisma (PostgreSQL), Redis/BullMQ, Auth.js, tRPC.

## Требования

- Node.js 20+ (как в `Dockerfile`; для локального запуска без Docker подойдёт актуальный LTS)
- Docker — для PostgreSQL и Redis локально или для полного стека

## Окружение

Скопируйте [`.env.example`](.env.example) в `.env` и заполните значения. Приложение и Prisma CLI при старте читают [`src/env.ts`](src/env.ts): обязательные переменные проверяются через Zod, без «тихих» подстановок по умолчанию — при ошибке процесс завершается сразу (fail-fast).

- **`FEATURE_REAL_PAYMENTS` / `FEATURE_RATE_LIMITING` / `ENABLE_BULLMQ_WORKERS`** — только строки `true` или `false`.
- При **`FEATURE_REAL_PAYMENTS=true`** в окружении должны быть непустые **`YOOKASSA_SHOP_ID`** и **`YOOKASSA_SECRET_KEY`**.
- **`npm run build`** / **`next start`** требуют того же полного набора переменных, что и `next dev`. Плагин Sentry в [`next.config.ts`](next.config.ts) использует те же провалидированные поля (`SENTRY_*`), без подстановки имени проекта по умолчанию.
- **Playwright** (`npm run test:e2e`): в `.env` обязательна **`PLAYWRIGHT_BASE_URL`** (см. `playwright.config.ts`).

Комментарии внутри `.env.example` описывают назначение полей.

## Запуск

### Вариант A: только БД и Redis в Docker, приложение на хосте

```bash
cp .env.example .env
docker compose up -d db redis
npm ci
npm run db:migrate
npm run dev
```

Приложение: [http://localhost:3000](http://localhost:3000). В `.env` используйте `DATABASE_URL` и `REDIS_URL` на `localhost` (по умолчанию Postgres на **5433**, Redis на **6380** — смотрите `docker-compose.yml`, чтобы не конфликтовать с уже занятыми 5432/6379).

### Вариант B: приложение вместе с БД и Redis (`docker compose`)

```bash
cp .env.example .env
docker compose up --build
```

После первого подъёма с пустой БД примените миграции:
`docker compose exec app npm run db:migrate:deploy`

Сервис `app` читает `.env` через `env_file`; в compose заданы только переопределения `DATABASE_URL` и `REDIS_URL` для сети контейнеров. Остальные ключи из списка в `.env.example` должны присутствовать в `.env` — иначе приложение не пройдёт валидацию в `src/env.ts`. Для воркеров BullMQ в образе задано `ENABLE_BULLMQ_WORKERS=true` (см. `src/instrumentation.ts`).

## Полезные команды

| Команда                              | Назначение                      |
| ------------------------------------ | ------------------------------- |
| `npm run dev`                        | Режим разработки Next.js        |
| `npm run build` / `npm start`        | Продакшен-сборка и запуск       |
| `npm run lint` / `npm run typecheck` | ESLint и проверка типов         |
| `npm test`                           | Vitest                          |
| `npm run test:e2e` / `npm run test:e2e:ui` | Playwright                      |
| `npm run db:migrate`                 | Миграции Prisma (`migrate dev`) |
| `npm run db:migrate:deploy`          | Миграции на прод (`migrate deploy`) |
| `npm run db:seed`                    | Сид данных                      |
| `npm run db:studio`                  | Prisma Studio                   |
| `npm run db:generate`                | Только `prisma generate`        |
| `npm run playwright:install`         | Установка браузеров Playwright (CI/локально) |

## Документация по проекту

- Платежи по заявкам с вознаграждением проектируются через **безопасную сделку ЮKassa** (удержание у провайдера, без отдельного эскроу-счёта Referi); детали — `docs/PRD.md`, `spec/spec-data-payments-escrow.md`.
- `AGENTS.md` — соглашения и факты о стеке для ассистентов и разработчиков
- `spec/spec-architecture-referi-system.md` — архитектура системы
- `docs/ROADMAP.md` — дорожная карта (обновляется вместе с изменениями контракта и фич; см. `.cursor/rules/documentation-sync.mdc`)
