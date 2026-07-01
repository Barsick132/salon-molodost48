# molodost48 — сайт салона красоты «Молодость» (Липецк)

Корпоративный сайт + админка для салона красоты «Молодость» (бывш. FASHION PRO), г. Липецк.
Полностью настраивается из админки без передеплоя — контент, контакты, карта, логотип, обложка, услуги, видимость разделов.

## Архитектура

- **Frontend**: Vue 3 + Vite + Pinia + Vue Router 4 (TypeScript). SPA, без SSR.
- **Backend**: Node.js 22 LTS (Fastify 4 + Prisma 5).
- **DB**: PostgreSQL 16 (нативно, без Docker в проде).
- **Хранилище**: локальная папка `uploads/` + отдача через nginx (`/media/*`).
- **CI/CD**: GitHub Actions → SSH → деплой-скрипт на сервере.

## Маршруты

### Публичная часть
- `/` — лендинг, рендерится из блоков `Block` (hero, stats, advantages, cta-strip + услуги).
- `/services` — полный каталог услуг с ценами, временем, поиском и закладками категорий.
- `/contacts` — карта Яндекс, контакты, часы работы, соцсети, маршрут «Как проехать?».

### Админка
- `/admin/login` — логин. Чекбокс «Запомнить меня» (30 дней).
- `/admin/services` — CRUD категорий и услуг с reorder.
- `/admin/blocks` — редактор блоков лендинга (текст, иконки, обложка, порядок, вкл/выкл).
- `/admin/settings` — контакты, бренд (название, лого, favicon), карта (Яндекс/OSM/Google), видимость разделов.
- `/admin/integrations` — настройка DiKidi (виджет записи).
- Любой `requiresAuth`-маршрут → редирект на `/admin/login?redirect=...`.

## API

| Группа | Endpoints |
|---|---|
| Публичные | `GET /api/blocks`, `GET /api/settings`, `GET /api/services`, `GET /api/integrations`, `GET /api/integrations/dikidi/widget` |
| Health | `GET /healthz`, `GET /readyz` (проверяет подключение к БД) |
| Auth | `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`, `PATCH /api/admin/auth/me`, `POST /api/admin/auth/change-password`, `POST /api/admin/auth/forgot-password`, `POST /api/admin/auth/reset-password`, `POST /api/admin/auth/request-email-change`, `POST /api/admin/auth/confirm-email` |
| Admin CRUD | `GET/POST/PATCH/DELETE /api/admin/services/categories`, `…/services`, `/admin/blocks`, `/admin/site/{contact,map,visibility,brand}` |
| Media | `POST /api/admin/media` (multipart, 12 MB cap; jpeg/png/webp/svg) |

Все `/api/admin/*` защищены JWT-cookie. Rate-limit: `/auth/login` — 8/мин, всё остальное — 600/мин на IP.

## Безопасность

- **JWT cookie** (`molodost48_session`) — HttpOnly, SameSite=lax, Secure при HTTPS, `signed=false` (JWT сам подписан). TTL: **24h** без галочки «Запомнить меня», **30 дней** с галочкой.
- **Хэш пароля** — bcrypt cost 12.
- **Сессии** — таблица `AdminSession` хранит sessionId; logout удаляет строку → токен инвалидируется даже если JWT не истёк.
- **Helmet CSP** — разрешены только нужные источники: `self`, Dikidi, Yandex Maps, Nominatim (геокодер), Google Fonts.
- **CORS** — whitelist в `CORS_ORIGINS`.
- **Audit log** — каждое изменение настроек, блоков, услуг и т.п. пишется в таблицу `AuditLog` (кто, что, diff, IP, user-agent).
- **Секреты в логах** — `::add-mask::` + `${{ secrets.X }}` в GitHub Actions, никакого `echo` приватных ключей.
- **Не печатаются** токены / ключи / приватные SSH-ключи.

## Структура репо

```
apps/
  api/                  Fastify + Prisma backend
    src/
      config.ts         Zod-валидируемая конфигурация из /etc/molodost48/api.env
      index.ts          boot Fastify, регистрация плагинов и роутов
      plugins/
        auth.ts         сессии, JWT, requireAdmin hook
        email.ts        nodemailer, IPv4-only транспорт
        integrations.ts helpers getDikidi() etc
        prisma.ts       PrismaClient
      routes/
        admin.auth.ts                    login/logout/me/change-password/update-profile
        admin.auth.password-reset.ts     forgot/reset через email-токены
        admin.services.ts                CRUD категорий и услуг
        blocks.admin.ts                  CRUD блоков лендинга (hero/stats/advantages/cta-strip)
        blocks.public.ts                 GET /api/blocks (public, 30s cache)
        integrations.admin.ts            CRUD интеграций (DiKidi)
        integrations.public.ts           публичные проекции интеграций
        media.admin.ts                   multipart upload → /var/lib/molodost48/uploads/
        services.public.ts               GET /api/services
        settings.admin.ts                brand/contact/map/visibility/site (4 PUT endpoint)
        settings.public.ts               GET /api/settings (60s cache)
      prisma/
        migrations/                      SQL-файлы; deploy-api применяет через `prisma migrate deploy`
        schema.prisma                    Prisma schema (Service, Block, SiteSettings, ...)
        seed.ts                          первоначальные данные
  web/                  Vue 3 SPA
    src/
      layouts/
        AdminLayout.vue
        PublicLayout.vue
      pages/
        admin/
          LoginPage.vue          «Запомнить меня», показ/скрытие пароля, спиннер
          ServicesPage.vue       CRUD категорий и услуг с reorder
          BlocksPage.vue         CRUD блоков с type-specific редакторами
          SettingsPage.vue       4 секции: brand (logo/favicon upload), contact, map, visibility
          IntegrationsPage.vue   DiKidi widget URL + on/off
        public/
          HomePage.vue           рендер из блоков (hero/stats/advantages/cta-strip + services)
          ServicesPage.vue       каталог с поиском и sticky-tabs
          ContactsPage.vue       карта, контакты, часы работы, маршрут
      components/
        public/
          SiteHeader.vue         sticky header с бургером и логотипом
          SiteFooter.vue         footer с реальными контактами и часами
          DikidiBookingButton.vue   link → DiKidi widget с modal-mode
          DikidiWidget.vue       iframe для inline записи
        admin/
          AdminLayout.vue        grid + burger drawer
          AdminSidebar.vue       nav с иконками
          AdminTopbar.vue        top bar с бургером на mobile
      stores/
        auth.ts            JWT-cookie сессия
        blocks.ts          useBlocksStore (public + admin)
        integrations.ts    DiKidi конфиг
        site.ts            SiteSettings + brand + contact + map + pages
      router/index.ts     public + admin маршруты
      api/client.ts       fetch-обёртка с credentials + ApiError
      main.ts             bootstrap + dynamic favicon
      styles/main.css     дизайн-токены (Inter + Fraunces, accent #E11D48)
packages/
  shared/                 Zod-схемы + типы, общие между api и web
    admin.ts              AdminUser + AdminLoginRequest/Response + Master + Vacancy + MediaItem
    service.ts            ServiceCategory + Service
    integrations.ts       DikidiConfig + DikidiPublicConfig
    site.ts               зарезервировано (сейчас всё в settings routes)
    api-responses.ts      ApiError + Pagination
    blocks.ts             BlockType enum
deploy/
  nginx/molodost48-iponly.conf    активная конфигурация nginx для IP-only preview
  systemd/molodost48-api.service  systemd unit (cap 384 MB, restart on fail)
.github/workflows/
  ci.yml                 typecheck + lint + build на каждом PR
  deploy-api.yml         typecheck → git pull → pnpm install → prisma generate → migrate → restart
  deploy-web.yml         typecheck → vite build → scp dist → nginx reload
```

## Локальная разработка

```bash
# install
pnpm install

# env (требует postgres локально или в docker)
cp apps/api/.env.example apps/api/.env
# отредактировать DATABASE_URL, JWT_SECRET, COOKIE_SECRET

# generate prisma + migrate + seed
pnpm --filter @molodost/api run db:generate
pnpm --filter @molodost/api run db:migrate
pnpm --filter @molodost/api run db:seed

# run
pnpm --filter @molodost/api run dev      # backend :3000
pnpm --filter @molodost/web run dev      # frontend :5173
```

## Деплой

Push в `main` → GitHub Actions:
1. `ci` — typecheck на Node 24
2. `deploy-api` — SSH на сервер, `git reset --hard origin/main`, `pnpm install`, `prisma generate`, `prisma migrate deploy`, `systemctl restart molodost48-api`
3. `deploy-web` — `vite build`, scp `dist/` на сервер

Сервер: Ubuntu 22.04, nginx, systemd, fail2ban, 1 GB RAM. API ограничен 384 MB через `MemoryMax`.

## Дефолтные данные

После первого старта API автоматически:
- Создаёт админа `support@molodost48.ru` / пароль из env `ADMIN_BOOTSTRAP_PASSWORD` (обязательно сменить после первого входа).
- Сидит 4 блока лендинга по умолчанию (Hero с акцентной частью заголовка, Stats 12+/15000+/8/4.9, 4 преимущества с семантическими иконками, CTA-полоса).
- Сидит 4 категории услуг + 66 услуг из `apps/api/data/services-from-original.json`.

## Известные ограничения

- VPS блокирует исходящие SMTP-порты (25/465/587/2525) — email-функционал отключён до перехода на HTTP-API email-провайдера.
- VPS не имеет IPv6 — все DNS-resolvers форсированы на IPv4 (`family: 4` в SMTP и Nominatim).
- 1 GB RAM — Docker исключён; нативные бинарники, tuned Postgres.
- Это всё ещё single-tenant — нет multi-site или multi-user role system (только один admin).