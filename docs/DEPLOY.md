# Деплой molodost48

## Архитектура прод-стека

```
              ┌─────────────────┐
   Internet → │  nginx :80/443  │  ← TLS (Let's Encrypt)
              └────────┬────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
   /api/, /media/              /, /admin, /p/*
        │                             │
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│  Fastify :3000   │         │  Vue 3 SPA dist  │
│  systemd unit    │         │  nginx serves    │
│  user: molodost  │         │                  │
└────────┬─────────┘         └──────────────────┘
         │
         ▼
   ┌──────────────┐
   │ PostgreSQL   │ localhost only
   │   :5432      │
   └──────────────┘
```

## Подготовка сервера (один раз)

От root на сервере:

```bash
# 1. Установить пакеты (Node, PostgreSQL, nginx, certbot)
apt update
apt install -y nginx certbot python3-certbot-nginx
# Node 20 через NodeSource:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
corepack enable && corepack prepare pnpm@9.15.9 --activate

# 2. PostgreSQL
apt install -y postgresql-16 postgresql-contrib-16
sudo -u postgres psql -c "CREATE USER molodost WITH LOGIN PASSWORD 'GENERATE_ME';"
sudo -u postgres psql -c "CREATE DATABASE molodost48 OWNER molodost;"

# 3. Пользователь приложения
useradd -m -s /bin/bash -d /home/molodost molodost
mkdir -p /var/www/molodost48/{api,web} /var/log/molodost48 \
         /var/lib/molodost48/{uploads,backups} /etc/molodost48
chown -R molodost:molodost /var/www/molodost48 /var/log/molodost48 /var/lib/molodost48 /etc/molodost48

# 4. Копируем конфиги из репо
cp deploy/systemd/molodost48-api.service /etc/systemd/system/
cp deploy/nginx/molodost48.conf /etc/nginx/sites-available/molodost48
ln -sf /etc/nginx/sites-available/molodost48 /etc/nginx/sites-enabled/molodost48
rm -f /etc/nginx/sites-enabled/default
cp deploy/env.example /etc/molodost48/api.env
# Отредактируй /etc/molodost48/api.env (DATABASE_URL, JWT_SECRET, etc)
chown root:molodost /etc/molodost48/api.env
chmod 640 /etc/molodost48/api.env

systemctl daemon-reload
systemctl enable molodost48-api
systemctl restart nginx

# 5. TLS (когда домен привязан)
certbot --nginx -d molodost48.ru -d www.molodost48.ru
```

## GitHub Secrets

| Secret | Значение |
|---|---|
| `SERVER_HOST` | `31.42.120.181` |
| `SERVER_USER` | `root` (для деплоя) или `molodost` (если настроишь sudo) |
| `MOLODOST_DEPLOY_KEY` | приватный ed25519 ключ (тот что в `/root/.ssh/authorized_keys` на сервере) |

## Авто-деплой

Push в `main` → workflows `deploy-api.yml` + `deploy-web.yml` запускаются параллельно → build → atomic swap → restart.

## Бэкапы

Ежедневный cron (`/etc/cron.d/molodost48-backup`):

```
0 3 * * * molodost /usr/local/bin/molodost48-backup.sh
```

Скрипт `molodost48-backup.sh` (лежит в `deploy/scripts/`, установить отдельно):
- `pg_dump molodost48 | gzip > /var/lib/molodost48/backups/db-$(date +%F).sql.gz`
- Удалить бэкапы старше 7 дней
- Опционально: rsync в S3 / Яндекс.Облако

## Логи

- API: `journalctl -u molodost48-api -f`
- nginx access: `/var/log/nginx/molodost48.access.log`
- nginx error: `/var/log/nginx/molodost48.error.log`

Ротация: logrotate конфиг в `deploy/logrotate/molodost48` (опц.).

## Мониторинг

- Uptime check: внешний сервис (UptimeRobot, Healthchecks.io)
- Health endpoint: `GET /healthz` → `200 OK` (реализовать в api)
- Disk: `df -h /` — алерт при >85%
- RAM: `free -h` — нормально 500-700 MB used