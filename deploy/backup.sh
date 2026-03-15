#!/bin/bash
# BuildPro database backup script
# Usage: ./deploy/backup.sh
# Requires: pg_dump, POSTGRES_* env vars or .env file
#
# Recommended: run daily via cron
# 0 2 * * * /path/to/buildpro/deploy/backup.sh >> /var/log/buildpro-backup.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Defaults
DB_NAME="${POSTGRES_DB:-buildpro}"
DB_USER="${POSTGRES_USER:-buildpro}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting BuildPro backup..."

# Database backup
BACKUP_FILE="$BACKUP_DIR/buildpro_db_${TIMESTAMP}.sql.gz"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
    --no-owner --no-privileges \
    | gzip > "$BACKUP_FILE"

echo "[$TIMESTAMP] Database backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Media backup (if media directory exists)
MEDIA_DIR="$PROJECT_DIR/backend/media"
if [ -d "$MEDIA_DIR" ] && [ "$(ls -A "$MEDIA_DIR" 2>/dev/null)" ]; then
    MEDIA_BACKUP="$BACKUP_DIR/buildpro_media_${TIMESTAMP}.tar.gz"
    tar -czf "$MEDIA_BACKUP" -C "$PROJECT_DIR/backend" media/
    echo "[$TIMESTAMP] Media backup: $MEDIA_BACKUP ($(du -h "$MEDIA_BACKUP" | cut -f1))"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "buildpro_*" -mtime +"$KEEP_DAYS" -delete 2>/dev/null || true
echo "[$TIMESTAMP] Cleaned backups older than $KEEP_DAYS days"

echo "[$TIMESTAMP] Backup complete."
