# Referi

Next.js-приложение: Prisma (PostgreSQL), Redis/BullMQ, Auth.js, tRPC.

## Требования

- Node.js 20+ (как в `Dockerfile`; для локального запуска без Docker подойдёт актуальный LTS)
- Docker — для PostgreSQL и Redis локально или для полного стека

## Окружение

Скопируйте `.env.example` в `.env` и заполните переменные под свою машину. Комментарии внутри `.env.example` описывают назначение полей.

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
`docker compose exec app npx prisma migrate deploy`

Сервис `app` читает `.env`; в compose уже заданы `DATABASE_URL` и `REDIS_URL` для контейнеров. Для воркеров BullMQ в образе задано `ENABLE_BULLMQ_WORKERS=true` (см. `src/instrumentation.ts`).

## Полезные команды

| Команда                              | Назначение                      |
| ------------------------------------ | ------------------------------- |
| `npm run dev`                        | Режим разработки Next.js        |
| `npm run build` / `npm start`        | Продакшен-сборка и запуск       |
| `npm run lint` / `npm run typecheck` | ESLint и проверка типов         |
| `npm test`                           | Vitest                          |
| `npm run test:e2e`                   | Playwright                      |
| `npm run db:migrate`                 | Миграции Prisma (`migrate dev`) |
| `npm run db:seed`                    | Сид данных                      |
| `npm run db:studio`                  | Prisma Studio                   |

## Документация по проекту

- `AGENTS.md` — соглашения и факты о стеке для ассистентов и разработчиков
- `spec/spec-architecture-referi-system.md` — архитектура системы
- `docs/ROADMAP.md` — дорожная карта (может отставать от кода)
