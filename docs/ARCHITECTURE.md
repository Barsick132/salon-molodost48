# Архитектура molodost48

## Компоненты

| Слой | Технология | Где |
|---|---|---|
| Public site (лендинг) | Vue 3 SPA, рендер enabled blocks | nginx, статика в `/var/www/molodost48/web` |
| Admin | Vue 3 SPA, под роутами `/admin/*` | та же сборка |
| API | Fastify 4 + Prisma 5 + PostgreSQL 16 | systemd unit `molodost48-api`, :3000 |
| БД | PostgreSQL 16 | localhost:5432, db `molodost48`, owner `molodost` |
| Медиа | Локальная FS | `/var/lib/molodost48/uploads`, отдаётся nginx с кэшем |
| Auth | JWT в httpOnly cookie, bcrypt | api |
| Audit | Append-only таблица `AuditLog` | db |

## Доменная модель (упрощённо)

```
SiteSettings (singleton) — настройки сайта
NavItem — меню
Block — enabled/disabled секция лендинга с payload
ServiceCategory — категории услуг
Service — услуга с ценой
Master — мастер
Promotion — акция
GalleryCategory / GalleryItem — галерея
Room — зал/пространство
Review — отзыв (с модерацией)
Faq — FAQ
Vacancy — вакансия
StaticPage — страница (политика, оферта)
Media — медиа-библиотека
AdminUser + AdminSession — пользователи админки
AuditLog — журнал действий
```

## Блоки лендинга

Каждая секция лендинга — это row в `Block` с `type`, `enabled`, `order`, `payload`.

Список типов (см. `packages/shared/src/blocks.ts`):

- `hero` — главный экран
- `about` — о салоне
- `services` — услуги и цены
- `masters` — мастера
- `promotions` — акции
- `gallery` — галерея работ
- `rooms` — залы / интерьер
- `reviews` — отзывы
- `faq` — частые вопросы
- `vacancies` — вакансии
- `contacts` — контакты

В админке блоки можно:
- Включать/выключать (toggle)
- Менять порядок (drag-and-drop)
- Редактировать payload (форма под каждый тип)

На публичном сайте рендерятся только `enabled=true`, в порядке `order ASC`.

## Безопасность

- **Auth**: bcrypt(12) + JWT в httpOnly+SameSite=Lax cookie.
- **CSRF**: double-submit cookie или SameSite=Strict для state-changing.
- **Rate-limit**: `@fastify/rate-limit` на `/admin/login`.
- **Helmet**: secure headers на api + nginx.
- **CSP**: nginx-заголовок с ограниченным `script-src`/`connect-src`.
- **CORS**: разрешён только свой origin.
- **Upload**: multipart с лимитом 10 MB, sharp-валидация (только изображения, ресайз до 1920px).
- **SQL**: только Prisma (нет raw SQL → нет SQL injection).
- **SSH**: только ключ, после деплоя отключаем пароль.
- **Fail2ban**: ssh jail активен.
- **UFW**: 22/80/443 inbound.
- **Systemd hardening**: NoNewPrivileges, ProtectSystem=strict, MemoryMax=384M.

## Yandex.Справочник — импорт

1. Админ загружает CSV/XLSX из Справочника на `/admin/import`.
2. Backend парсит, нормализует в `YandexServiceRow[]`.
3. Возвращает preview с diff (новые / обновлённые / удалённые).
4. Админ нажимает «Применить» → `upsert` в `Service` и `ServiceCategory`.
5. Дедуп через `externalId` (сохраняется из экспорта).

## CI/CD

```
push to main
  ├─► ci.yml: typecheck (PR+main)
  ├─► deploy-api.yml: build api → scp → migrate → restart unit
  └─► deploy-web.yml: build web → scp → atomic swap → reload nginx
```

Atomic swap: build → `/var/www/molodost48/{api,web}.staging` → `mv` → `systemctl restart`. Никаких downtime.

## Что можно резать если упрёмся в лимит

По твоей формуле: «начиная с блоков, которых нет на исходном сайте».

На molodost48.ru есть: Главная, Прайс, Акции, Вакансии, Отзывы, Контакты.

Опциональные (можно отключить/удалить в схеме если упрёмся в RAM или диск):
- `masters` — мастера
- `gallery` — галерея работ
- `rooms` — залы
- `faq` — частые вопросы

При удалении из схемы — миграция `prisma migrate` откатит таблицы.