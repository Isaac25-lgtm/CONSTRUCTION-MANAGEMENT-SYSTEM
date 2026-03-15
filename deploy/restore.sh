#!/bin/bash
# BuildPro database restore script
# Usage: ./deploy/restore.sh backups/buildpro_db_20260315_020000.sql.gz
#
# WARNING: This drops and recreates the database. All current data will be lost.

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Example: $0 backups/buildpro_db_20260315_020000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

DB_NAME="${POSTGRES_DB:-buildpro}"
DB_USER="${POSTGRES_USER:-buildpro}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "WARNING: This will DROP and RECREATE the '$DB_NAME' database."
echo "All current data will be lost."
read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring from: $BACKUP_FILE"

# Drop and recreate
PGPASSWORD="${POSTGRES_PASSWORD}" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
PGPASSWORD="${POSTGRES_PASSWORD}" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Restore
gunzip -c "$BACKUP_FILE" | PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" -q

echo "Database restored successfully."
echo "Run 'python manage.py migrate' to apply any pending migrations."
