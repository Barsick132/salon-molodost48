#!/usr/bin/env bash
# =============================================================================
# molodost48 — full server provisioning.
#
# Run once on a fresh Ubuntu 22.04 VPS as root. Idempotent.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Barsick132/salon-molodost48/main/deploy/scripts/setup-server.sh | bash -s -- \
#       --ssh-pubkey "ssh-ed25519 AAAA..." \
#       --domain molodost48.ru \
#       --admin-email admin@molodost48.ru \
#       --admin-password 'StrongPass123!'
#
# Or locally (after copying bundle/repo):
#   ./deploy/scripts/setup-server.sh --ssh-pubkey "$(cat ~/.ssh/id_ed25519.pub)" \
#                                   --domain molodost48.ru \
#                                   --admin-email admin@molodost48.ru \
#                                   --admin-password '...'
# =============================================================================

set -euo pipefail

# ---------- args ----------
SSH_PUBKEY=""
DOMAIN="molodost48.ru"
ADMIN_EMAIL="admin@molodost48.ru"
ADMIN_PASSWORD=""
REPO_URL="https://github.com/Barsick132/salon-molodost48.git"
APP_USER="molodost"
PG_USER="molodost"
PG_DB="molodost48"
PG_PASS=""
JWT_SECRET=""
GITHUB_DEPLOY_PUBKEY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssh-pubkey)        SSH_PUBKEY="$2"; shift 2 ;;
    --domain)            DOMAIN="$2"; shift 2 ;;
    --admin-email)       ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password)    ADMIN_PASSWORD="$2"; shift 2 ;;
    --repo-url)          REPO_URL="$2"; shift 2 ;;
    --pg-pass)           PG_PASS="$2"; shift 2 ;;
    --jwt-secret)        JWT_SECRET="$2"; shift 2 ;;
    --deploy-pubkey)     GITHUB_DEPLOY_PUBKEY="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$SSH_PUBKEY" ]]; then echo "ERROR: --ssh-pubkey required"; exit 1; fi
if [[ -z "$ADMIN_PASSWORD" || "${#ADMIN_PASSWORD}" -lt 12 ]]; then echo "ERROR: --admin-password must be at least 12 chars"; exit 1; fi
[[ -z "$PG_PASS" ]] && PG_PASS="$(openssl rand -hex 24)"
[[ -z "$JWT_SECRET" ]] && JWT_SECRET="$(openssl rand -hex 64)"

LOG=/var/log/molodost48-setup.log
mkdir -p /var/log
exec > >(tee -a "$LOG") 2>&1
echo "=== molodost48 setup started at $(date -Is) ==="

# ---------- 1. base packages ----------
echo "[1/8] Installing base packages…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  curl wget git build-essential ca-certificates gnupg lsb-release \
  apt-transport-https software-properties-common ufw fail2ban jq unzip \
  nginx certbot python3-certbot-nginx

# ---------- 2. Node.js 20 LTS ----------
echo "[2/8] Installing Node.js 20 LTS…"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
corepack enable
mkdir -p /opt/pnpm
npm install --prefix /opt/pnpm pnpm@9.15.9 2>&1 | tail -2
ln -sf /opt/pnpm/node_modules/pnpm/bin/pnpm.cjs /usr/local/bin/pnpm
echo "  node=$(node -v) pnpm=$(pnpm -v)"

# ---------- 3. PostgreSQL 16 ----------
echo "[3/8] Installing PostgreSQL 16…"
if ! command -v psql >/dev/null; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update
  apt-get install -y postgresql-16 postgresql-contrib-16
fi
systemctl enable postgresql

# low-RAM tuning
PGCONF=/etc/postgresql/16/main/postgresql.conf
python3 - "$PGCONF" <<'PYCFG'
import re, sys
p = sys.argv[1]
with open(p) as f: c = f.read()
def setf(k, v):
    global c
    pat = re.compile(rf'^\s*#?\s*{re.escape(k)}\s*=.*$', re.M)
    new = f"{k} = {v}"
    if pat.search(c): c = pat.sub(new, c)
    else: c += "\n"+new
for k, v in [
    ('shared_buffers','64MB'),
    ('effective_cache_size','512MB'),
    ('work_mem','4MB'),
    ('maintenance_work_mem','64MB'),
    ('max_connections','30'),
    ("listen_addresses","'localhost'"),
]: setf(k, v)
with open(p, 'w') as f: f.write(c)
PYCFG

systemctl restart postgresql
sleep 2

# create role + db
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER $PG_USER WITH LOGIN PASSWORD '$PG_PASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;"
echo "  PG ready: $PG_DB @ $PG_USER"

# ---------- 4. user + dirs ----------
echo "[4/8] Creating app user…"
id $APP_USER >/dev/null 2>&1 || useradd -m -s /bin/bash -d /home/$APP_USER $APP_USER
mkdir -p /var/www/molodost48/{api,web} /var/log/molodost48 \
         /var/lib/molodost48/{uploads,backups} /etc/molodost48
chown -R $APP_USER:$APP_USER /var/www/molodost48 /var/log/molodost48 /var/lib/molodost48 /etc/molodost48
chmod 750 /var/lib/molodost48/uploads

# Add /usr/local/bin to PATH for $APP_USER
echo 'export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"' >> /home/$APP_USER/.bashrc

# Sudo rule: molodost can manage its own service
cat > /etc/sudoers.d/molodost48 <<EOF
Defaults secure_path = /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin
$APP_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart molodost48-api, /bin/systemctl status molodost48-api, /usr/bin/journalctl -u molodost48-api, /usr/sbin/nginx -t, /bin/systemctl reload nginx
EOF
chmod 440 /etc/sudoers.d/molodost48

# ---------- 5. SSH hardening ----------
echo "[5/8] Hardening SSH…"
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "$SSH_PUBKEY" >> /root/.ssh/authorized_keys
sort -u /root/.ssh/authorized_keys -o /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

# Deploy key for GitHub Actions (if provided)
if [[ -n "$GITHUB_DEPLOY_PUBKEY" ]]; then
  mkdir -p /home/$APP_USER/.ssh && chmod 700 /home/$APP_USER/.ssh
  echo "$GITHUB_DEPLOY_PUBKEY" >> /home/$APP_USER/.ssh/authorized_keys
  sort -u /home/$APP_USER/.ssh/authorized_keys -o /home/$APP_USER/.ssh/authorized_keys
  chown -R $APP_USER:$APP_USER /home/$APP_USER/.ssh
  chmod 600 /home/$APP_USER/.ssh/authorized_keys
fi

# ---------- 6. env file + system configs ----------
echo "[6/8] Writing configs…"
DATABASE_URL="postgresql://$PG_USER:$PG_PASS@127.0.0.1:5432/$PG_DB?schema=public"

cat > /etc/molodost48/api.env <<EOF
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
LOG_LEVEL=info

DATABASE_URL=$DATABASE_URL

JWT_SECRET=$JWT_SECRET
COOKIE_DOMAIN=$DOMAIN
COOKIE_SECURE=true

MEDIA_ROOT=/var/lib/molodost48/uploads
MEDIA_PUBLIC_BASE=/media
MAX_UPLOAD_BYTES=10485760

BACKUP_DIR=/var/lib/molodost48/backups
BACKUP_RETENTION_DAYS=7

CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
EOF
chown root:$APP_USER /etc/molodost48/api.env
chmod 640 /etc/molodost48/api.env

# systemd unit
cp /tmp/molodost48-deploy/systemd/molodost48-api.service /etc/systemd/system/molodost48-api.service
systemctl daemon-reload
systemctl enable molodost48-api

# nginx site
cp /tmp/molodost48-deploy/nginx/molodost48.conf /etc/nginx/sites-available/molodost48
ln -sf /etc/nginx/sites-available/molodost48 /etc/nginx/sites-enabled/molodost48
rm -f /etc/nginx/sites-enabled/default

# logrotate
cp /tmp/molodost48-deploy/logrotate/molodost48 /etc/logrotate.d/molodost48

# backup cron
cp /tmp/molodost48-deploy/scripts/molodost48-backup.sh /usr/local/bin/molodost48-backup.sh
chmod 755 /usr/local/bin/molodost48-backup.sh
cat > /etc/cron.d/molodost48-backup <<EOF
0 3 * * * $APP_USER /usr/local/bin/molodost48-backup.sh
EOF

# logrotate + apt cleanup cron
cat > /etc/cron.d/molodost48-maintenance <<EOF
30 3 * * 0 root /usr/bin/apt-get autoclean -y >/dev/null 2>&1
EOF

# journald size cap
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/molodost48.conf <<EOF
[Journal]
SystemMaxUse=200M
EOF
systemctl restart systemd-journald

# ---------- 7. firewall ----------
echo "[7/8] Configuring firewall…"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# fail2ban
systemctl enable fail2ban
systemctl restart fail2ban

# ---------- 8. nginx test + reload ----------
echo "[8/8] Final checks…"
nginx -t && systemctl reload nginx

# Save bootstrap secrets for the operator
cat > /root/.molodost48-secrets <<EOF
# molodost48 bootstrap secrets — KEEP SAFE.
# Generated: $(date -Is)

PG_USER=$PG_USER
PG_DB=$PG_DB
PG_PASS=$PG_PASS
DATABASE_URL=$DATABASE_URL

JWT_SECRET=$JWT_SECRET

ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

DOMAIN=$DOMAIN
EOF
chmod 600 /root/.molodost48-secrets

cat <<EOF

════════════════════════════════════════════════════════════════════
✅  molodost48 server setup complete.

   PostgreSQL:    $PG_DB @ $PG_USER
   DATABASE_URL:  $DATABASE_URL
   Admin email:   $ADMIN_EMAIL
   Admin pass:    $ADMIN_PASSWORD
   Domain:        $DOMAIN

   Secrets saved to: /root/.molodost48-secrets (chmod 600)

   Next steps:
   1. Add DNS A record: $DOMAIN → $(curl -fsS ifconfig.me 2>/dev/null || echo '<this-server-ip>')
   2. Provision TLS:   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
   3. Deploy app:      git push to main → CI/CD picks up
   4. Disable password SSH (after verifying key works):
        sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
        systemctl restart sshd

════════════════════════════════════════════════════════════════════
EOF