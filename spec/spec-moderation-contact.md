---

## title: Referi — контакт модерации (публичная ссылка)
version: 1.0
date_created: 2026-05-01
owner: Referi Engineering
tags: moderation, ui, configuration

# Introduction

Модерация споров и жалоб выполняется через **данные в Referi** (`ModeratorCase`, `AbuseReport`) и **админ-панель** (`/admin`, роутеры `moderation.`*). Отдельной серверной интеграции с мессенджерами нет.

Для **дополнительной связи** пользователя с командой модерации вне приложения используется **одна публичная ссылка**, задаваемая в окружении.

## Переменная окружения


| Переменная                           | Обязательная | Описание                                                                                                                                              |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_MODERATION_CONTACT_URL` | Нет          | HTTPS- или другая ссылка на открытый контакт (например `https://t.me/username`). При заданном значении показывается пункт «Написать в поддержку» в меню профиля в шапке и ссылка в сценариях с жалобой (см. ниже). |


Ссылка попадает в клиентский бандл (`NEXT_PUBLIC_`*): не использовать для секретов. На клиенте значение читается через `[src/publicEnv.ts](../src/publicEnv.ts)` (без импорта полной схемы `src/env.ts`).

## Поведение в UI

- После успешной отправки жалобы на рефералку пользователю показывается **toast** (Sonner) с подтверждением ([`src/app/vacancies/[id]/ReportVacancyForm.tsx`](../src/app/vacancies/[id]/ReportVacancyForm.tsx)).
- При заданной переменной: пункт **«Написать в поддержку»** в выпадающем меню профиля в шапке ([`src/components/ModerationContactMenuItem.tsx`](../src/components/ModerationContactMenuItem.tsx), [`PublicHeaderNav`](../src/components/PublicHeaderNav.tsx) / [`DashboardHeaderNav`](../src/components/DashboardHeaderNav.tsx) / [`AdminHeaderNav`](../src/components/AdminHeaderNav.tsx)); опционально ссылка в блоке действий по заявке ([`ModerationContactLink`](../src/components/ModerationContactLink.tsx), потребитель — например [`ApplicationDetailActions`](../src/app/(account)/applications/[id]/ApplicationDetailActions.tsx)).

## Связанные документы

- [spec-design-api.md](spec-design-api.md) — REST: только вебхук ЮKassa для платежей.
- [docs/PRD.md](../docs/PRD.md) — модерация и жалобы.
