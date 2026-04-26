## Learned User Preferences

- Обновлять долговременную память проекта через поток continual-learning (memory-updater), а не править `AGENTS.md` параллельно в том же сценарии без необходимости.
- Ожидать рабочую сборку, осмысленное снятие TODO и исправление предупреждений без массовых `eslint-disable` / заглушек.
- Для приёмки важны ручной прогон на localhost и совместимость с локальным Docker/env из `.env.example`.
- Общение с ассистентом в чате — на русском; код, UI-копирайт и доки — по языку проекта и принятым в репозитории конвенциям.

## Learned Workspace Facts

- Воркеры BullMQ (`startSLAWorker`, `startPaymentWorker`) стартуют из `src/instrumentation.ts` в `register()` при `NEXT_RUNTIME === "nodejs"`; при `CI=true` не поднимаются; включение/выключение задаётся `ENABLE_BULLMQ_WORKERS` (`true`/`false`), иначе в development воркеры включены по умолчанию; в `docker-compose.yml` для сервиса `app` задано `ENABLE_BULLMQ_WORKERS=true`.
- В `slaWorker` и `paymentWorker` используются ленивое создание очередей и в `src/lib/redis.ts` у IORedis включён `lazyConnect`, чтобы при `next build` не было подключения к Redis и ошибок `ECONNREFUSED`.
- SLA в очереди завязаны на сценарии: первый отклик, дедлайн оплаты после подтверждения намерения, передача резюме, SLA подтверждения отмены соискателем, дедлайн решения компании.
- Платёжная очередь обрабатывает capture после принятия оффера, возвраты и payout; для выплат используется `User.yookassaPayoutDestination`, для локального мока — `YOOKASSA_PAYOUT_MOCK_WALLET`.
- События ЮKassa обрабатываются через модуль `yookassaWebhookHandlers`; мок-поток оплаты: страница `/pay/mock` и `POST /api/pay/mock-complete`; при `FEATURE_REAL_PAYMENTS=true` HTTP-вебхук проверяет Basic Auth из `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`.
- Транзакционная почта — Nodemailer при включённых SMTP/флагах; запрос отмены соискателем сопровождается уведомлением рефереру в Telegram при включённой интеграции.
- Клиент Prisma создаётся в `src/lib/prisma.ts` с драйвером PostgreSQL через `@prisma/adapter-pg` и пул `pg` (требование Prisma 7 для engine type client).
- Обязательное правило `.cursor/rules/organic-redesign.mdc`: правки без обратной совместимости и без комментариев о прошлой реализации; после изменений `schema.prisma` в агентском режиме локальную БД приводят к согласованному состоянию через сброс/полное применение схемы, без «полу-применённого» состояния для ручного теста.
- Таблица прогресса в `docs/ROADMAP.md` может отставать от фактической реализации, пока её не обновят вручную по DoD.
- Если `node_modules/.bin/next` или `tsc` оказались обычными файлами вместо симлинков и падают с неверными относительными путями, обычно помогает чистая переустановка: `rm -rf node_modules && npm ci`.
