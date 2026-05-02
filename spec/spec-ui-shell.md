# UI shell (навигация и страницы)

Нормативное описание оболочки интерфейса после выравнивания с публичным каталогом вакансий.

## Компоненты шапки

| Область | Компонент | Файл |
|--------|-----------|------|
| Публичные страницы (каталог, деталь вакансии, login, регистрация, mock-оплата, pay без вложенного layout) | `PublicHeaderNav` | [`src/components/PublicHeaderNav.tsx`](../src/components/PublicHeaderNav.tsx) |
| Кабинет `/dashboard/*` | `DashboardHeaderNav` + layout | [`src/components/DashboardHeaderNav.tsx`](../src/components/DashboardHeaderNav.tsx), [`src/app/dashboard/layout.tsx`](../src/app/dashboard/layout.tsx) |
| Модерация `/admin/*` | `AdminHeaderNav` + layout | [`src/components/AdminHeaderNav.tsx`](../src/components/AdminHeaderNav.tsx), [`src/app/admin/layout.tsx`](../src/app/admin/layout.tsx) |

Правило: **первичная навигация задаётся в `layout.tsx` соответствующего сегмента**, а не дублируется в каждой `page.tsx`. В шапках кабинета и админки доступны переключатель темы (`ThemeToggle`) и выход из аккаунта (через меню профиля).

## Поверхность страницы и токены

Фон «страницы приложения» (в т.ч. каталог и кабинет) задаётся CSS-переменной **`--app-page-surface`** в [`src/app/globals.css`](../src/app/globals.css). Акценты поиска и CTA PRO в шапке: **`--app-search-accent-*`**, **`--app-nav-cta-*`**.

Тема: `next-themes` в корневом [`src/app/layout.tsx`](../src/app/layout.tsx); семантические классы Tailwind (`bg-background`, `text-muted-foreground`, `border-border`, компоненты shadcn) предпочтительнее сырых `gray-*`.

## Формы

Клиентские формы в кабинете и жалобах используют **`FieldGroup` / `Field` / `FieldLabel`** из [`src/components/ui/field.tsx`](../src/components/ui/field.tsx), **`Input`**, **`Textarea`**, **`Select`**, **`Button`**, **`Alert`** — без вертикальных отступов через `space-y-*` (вместо них `flex flex-col gap-*` или встроенные зазоры `FieldGroup`).

## Связанные спеки

- [`spec-architecture-referi-system.md`](spec-architecture-referi-system.md) — дерево `src/app/` и слой компонентов.
