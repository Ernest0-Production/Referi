---
name: run-localhost
description: Поднимает и проверяет сервер разработки Referi на http://localhost:3000 — при необходимости запускает Docker Desktop через терминал (macOS), затем docker compose и npm run dev на хосте. Использовать при запросе поднять localhost, dev-сервер, docker compose, Docker daemon недоступен, проверить UI вручную, или при ошибках Prisma/Redis к локальной БД.
disable-model-invocation: false
---

# Запуск сервера разработки (Referi)

Цель: рабочее приложение на **http://localhost:3000**. Next.js на хосте и сервис **`app`** в Docker оба слушают **3000** на машине — **не запускать оба варианта одновременно**.

Расширенно см. [`README.md`](README.md) (раздел «Запуск») и [`docker-compose.yml`](docker-compose.yml).

## Подготовка

- Есть **`.env`** из **`.env.example`**, поля проходят **`src/env.ts`** (fail-fast при старте).

## Docker Desktop не отвечает (macOS)

Если **`docker compose`** / **`docker info`** падают с **Cannot connect to the Docker daemon** (или аналог про сокет), а проект на **локальной машине пользователя с GUI**:

1. При наличии **`/Applications/Docker.app`** выполнить **`open -a Docker`** (или **`open /Applications/Docker.app`**).
2. Подождать готовность демона: в цикле **`docker info`** (типично несколько секунд, при необходимости до **~30–60 с**).
3. Если **`open`** недоступен, окружение без графики или после ожидания демон не поднялся — **остановиться** и попросить пользователя запустить Docker Desktop вручную.

Без работающего демона ни **вариант 1**, ни **вариант 2** через compose не выполнить.

## Вариант 1: приложение на localhost, БД и Redis в Docker

```bash
docker compose up -d db redis
npm run dev
```

- **`docker compose ps`**: `db` и `redis` — **running/healthy**.
- В **`.env`**: **`DATABASE_URL`**, **`REDIS_URL`** на **localhost**; порты по compose: Postgres **5433**, Redis **6380** (если не переопределено).
- Пустая БД: **`npm run db:migrate`**; при необходимости **`npm run db:seed`**.

## Вариант 2: весь стек в Docker

```bash
docker compose up --build
```

- Снаружи тот же URL: **http://localhost:3000**.
- Пустая БД после первого подъёма: **`docker compose exec app npm run db:migrate:deploy`**.

## Поведение агента

- Запрос «поднять сервер» / «localhost» / ручная проверка UI: при ошибке демона Docker на macOS — **сначала** раздел **Docker Desktop не отвечает**, затем **`docker compose up`** для нужных сервисов, затем **`npm run dev`** (если не занят порт **3000** сервисом **`app`** из compose).
- При ошибках подключения к БД/Redis при уже работающем демоне — **`docker compose ps`** и согласование URL в **`.env`** с **`docker-compose.yml`**, а не бесконечный **`npm run dev`** без контейнеров.
