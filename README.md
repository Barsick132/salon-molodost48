# Салон красоты «Молодость» — molodost48.ru

Корпоративный сайт + админка для салона красоты «Молодость» (бывш. FASHION PRO), г. Липецк.

- **Public**: лендинг с услугами, ценами, мастерами, галереей, контактами — без авторизации.
- **Admin**: защищённая админка (`/admin`) для управления всем контентом сайта: услуги, цены, мастера, фотогалерея, акции, отзывы, вакансии, FAQ, навигация, тема, импорт прайса из Яндекс.Справочника.

## Стек

| Слой | Технология |
|---|---|
| Frontend (public + admin) | Vue 3 + Vite + Pinia + Vue Router, TypeScript |
| Backend | Node.js 20 + Fastify + Prisma |
| БД | PostgreSQL 16 |
| Storage | Локальная папка `uploads/` + отдача через nginx |
| CI/CD | GitHub Actions → SSH → сервер |
| Server | Ubuntu 22.04, nginx, systemd, fail2ban, UFW |

## Структура monorepo

```
apps/
  api/        # Fastify + Prisma backend
  web/        # Vue 3 SPA (public + admin)
packages/
  shared/     # Zod-схемы и общие типы между api и web
deploy/
  nginx/      # Конфиги nginx
  systemd/    # systemd unit
docs/         # Архитектура, деплой, админ-мануал
.github/
  workflows/  # CI/CD
```

## Быстрый старт (локальная разработка)

Требования: Node ≥ 20, pnpm ≥ 9, PostgreSQL 16.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# отредактируй DATABASE_URL
pnpm --filter @molodost/api db:migrate
pnpm --filter @molodost/api db:seed
pnpm dev          # параллельный запуск api (3000) + web (5173)
```

## Деплой на сервер

См. [`docs/DEPLOY.md`](docs/DEPLOY.md). Авто-деплой по push в `main`:

- `apps/api` → build → systemd `molodost48-api.service` на сервере
- `apps/web` → build → статика в `/var/www/molodost48/web`

**Docker (опционально).** Есть `Dockerfile.api` (multi-stage, alpine, non-root, healthcheck, tini) и `docker-compose.yml` для локальной разработки. **На проде деплой нативный через systemd** — на 1 GB RAM Docker daemon съест ~150 MB overhead, что нерационально, когда Postgres уже нативно. Используй Docker для dev и CI/CD. См. комментарии в `Dockerfile`.

**Автоустановка с нуля.** `deploy/scripts/setup-server.sh` — idempotent bash-скрипт, который развернёт весь стек на свежем Ubuntu 22.04 за один запуск (Node 20, PostgreSQL 16 с low-end tuning, nginx, systemd unit, UFW, fail2ban, logrotate, backup cron).

## Интеграции

- **Dikidi** — онлайн-запись: виджет + deep-link + sticky mobile CTA + заглушка под Business API sync. См. [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).
- Яндекс.Справочник — импорт каталога услуг (`/admin/import`).
- Yandex.Maps, Telegram, WhatsApp, SMTP — каркас готов (`IntegrationConfig`); подключаем по запросу.

## Дизайн-концепт

Dark-тема с красными акцентами:

| | |
|---|---|
| Фон | `#0A0A0A` / `#111` / `#1A1A1A` |
| Текст | `#F5F5F5` / `#A1A1AA` / `#52525B` |
| Акцент | `#E11D48` (red-rose-600) |
| Hover | `#F43F5E` + лёгкий glow |
| Шрифт | Inter / Geist |

## Блоки лендинга

Каждый блок (Hero, О салоне, Услуги, Мастера, Галерея, Акции, Отзывы, FAQ, Контакты) — сущность с флагом `enabled` и порядком. В админке — drag-and-drop + toggle. Выключенные блоки не рендерятся на публичном сайте.

## Безопасность

- Пароль админа — bcrypt.
- JWT в httpOnly cookie (Secure, SameSite=Lax).
- CSRF-защита для state-changing запросов.
- Rate-limit на login.
- Helmet на Fastify, CSP на nginx.
- Серверный SSH — только по ключу (после первоначальной настройки).
- UFW: 22/80/443 inbound.
- fail2ban для sshd.

## Лицензия

Proprietary, © ООО «ФЭШН ПРО».

---

## Статус разработки

- ✅ Skeleton (monorepo, Prisma, Fastify, Vue 3, pnpm)
- ✅ Docker (dev/CI), Dikidi integration, auto-setup script
- ✅ Initial migration + lockfile
- 🚧 Реализация routes, admin UI, public blocks (в работе)