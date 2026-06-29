# Интеграции — molodost48

Сторонние сервисы, к которым мы подключаемся. Все интеграции настраиваются через админку: `/admin/integrations`.

## Dikidi — онлайн-запись

**Что это:** сервис онлайн-записи клиентов, где у салона уже есть страница [dikidi.ru/1475188](https://dikidi.ru/1475188).

**Что мы делаем:**

| Фича | Описание | Сейчас |
|---|---|---|
| **Кнопка «Записаться»** в шапке и hero | Открывает Dikidi widget прямо на нашем сайте (модалка + iframe), клиент не уходит с molodost48.ru | ✅ работает |
| **Deep-link** на конкретного мастера / услугу | `<DikidiBookingButton :service-id="..." :master-id="..." />` подставляет параметры в URL виджета | ✅ работает |
| **Sticky mobile CTA** | Плавающая кнопка внизу экрана на мобильных | ✅ работает (включается в настройках) |
| **Fallback на публичную страницу** | Если Dikidi отключён в настройках — кнопка ведёт на dikidi.ru/1475188 | ✅ работает |
| **Синхронизация каталога** через Business API | Услуги и мастера из Dikidi → наша БД | ⚠️ заглушка, нужен API token |
| **Свободные слоты** на странице мастера | Показать ближайшее свободное время у мастера | 🔜 после получения API token |
| **Webhook о новой записи** | Админу в Telegram или email | 🔜 позже |

### Настройка

1. **Без API token (минимум):** уже работает. Виджет открывается, deep-link работает, sticky CTA работает.
2. **С API token (полная интеграция):**
   - Зайдите в [business.dikidi.ru](https://business.dikidi.ru) как владелец салона
   - Настройки → Интеграции → API
   - Создайте ключ с правами `catalog:read`, `schedule:read`
   - Скопируйте токен в `/admin/integrations` → Dikidi → API token
   - Нажмите «Синхронизировать каталог»

### Архитектура

```
SiteSettings.bookingUrl   ← старая ссылка, остаётся как fallback
IntegrationConfig("dikidi") ← новая интеграция, хранит публичный config + credentials
                             ↑
                             └── DikidiPublicConfig (без apiToken) → отдаётся на /api/integrations
                             └── DikidiConfig (с apiToken) → только для /api/admin/integrations/dikidi
```

Бэкенд грузит конфиг из `IntegrationConfig`. Фронт при инициализации дёргает `/api/integrations` и кладёт в Pinia store `useIntegrationsStore`. Все кнопки «Записаться» используют `<DikidiBookingButton>` — он автоматически берёт актуальный config.

## Yandex.Maps / Google Maps (TODO)

В `IntegrationConfig` уже есть `type: "maps"` как enum. Можно подключить когда понадобится.

## Telegram / WhatsApp-бот (TODO)

Аналогично. Через `IntegrationConfig.type = "messenger"`.

## Email SMTP (TODO)

Для transactional писем (подтверждение записи, уведомления админу). Пока не подключён — Dikidi сам шлёт клиентам подтверждения.