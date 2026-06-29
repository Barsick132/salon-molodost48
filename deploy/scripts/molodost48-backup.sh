#!/usr/bin/env bash
# Daily backup: PostgreSQL dump + uploads tarball.
# Retention: 7 days.
set -euo pipefail

BACKUP_DIR=/var/lib/molodost48/backups
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}
STAMP=$(date +%F_%H%M)

mkdir -p "$BACKUP_DIR"

# DB
PGPASSWORD=$(grep -oP 'DATABASE_URL=\Kpostgresql://[^:]+:[^@]+' /etc/molodost48/api.env | sed 's|^postgresql://[^:]*:||; s|@.*||')
DB_URL=$(grep '^DATABASE_URL=' /etc/molodost48/api.env | cut -d= -f2-)

pg_dump "$DB_URL" | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

# Media (only changed/new files; full weekly via cron.d/weekly)
if [ "$(date +%u)" = 7 ]; then
  tar -czf "$BACKUP_DIR/media-$STAMP.tar.gz" -C /var/lib/molodost48 uploads || true
fi

# Rotate old
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete

ls -lh "$BACKUP_DIR" | tail