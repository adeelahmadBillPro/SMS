#!/bin/sh
# ShopOS nightly Postgres backup.
#
# Runs inside the `backup` container. Invoked by supercronic on the
# BACKUP_CRON schedule (default: 22:00 UTC = 03:00 PKT).
#
# Writes a custom-format dump to /var/backups/shopos/ (bind-mounted from
# /var/backups/shopos on the host) with filename
#   shopos_YYYYMMDD_HHMMSS.dump
# then invokes prune.sh to enforce the retention policy, and finally
# (optionally) uploads to a remote target.
#
# Required env (from /etc/shopos/.env via docker-compose.yml):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# Optional:
#   BACKUP_REMOTE   none|r2|b2   (default: none)
#   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET

set -eu

BACKUP_DIR="/var/backups/shopos"
TS="$(date -u +%Y%m%d_%H%M%S)"
OUT="${BACKUP_DIR}/shopos_${TS}.dump"

mkdir -p "$BACKUP_DIR"

echo "[backup] $(date -u -Iseconds) starting dump -> $OUT"

# --format=custom is compressed + supports parallel restore via pg_restore -j.
# --no-owner drops role-specific GRANTs that wouldn't replay on a restore
# target with different roles; RLS policies themselves are preserved.
pg_dump \
  --host="${PGHOST}" --port="${PGPORT:-5432}" \
  --username="${PGUSER}" --dbname="${PGDATABASE}" \
  --format=custom --compress=9 --no-owner --no-acl \
  --file="${OUT}.tmp"

mv "${OUT}.tmp" "$OUT"
SIZE=$(stat -c%s "$OUT")
if [ "$SIZE" -lt 1024 ]; then
  echo "[backup] ERROR: dump is suspiciously small ($SIZE bytes). Aborting." >&2
  rm -f "$OUT"
  exit 2
fi
echo "[backup] done — ${SIZE} bytes"

# Optional remote upload. Skipped silently when BACKUP_REMOTE=none (default).
case "${BACKUP_REMOTE:-none}" in
  r2)
    if [ -z "${R2_ACCOUNT_ID:-}" ] || [ -z "${R2_ACCESS_KEY_ID:-}" ] || [ -z "${R2_SECRET_ACCESS_KEY:-}" ] || [ -z "${R2_BUCKET:-}" ]; then
      echo "[backup] R2 creds missing — skipping upload" >&2
    else
      echo "[backup] uploading to R2 bucket ${R2_BUCKET}"
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
      AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
      aws s3 cp "$OUT" "s3://${R2_BUCKET}/$(basename "$OUT")" \
        --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    fi
    ;;
  b2|none|"") ;;
  *) echo "[backup] unknown BACKUP_REMOTE=${BACKUP_REMOTE} — skipping upload" >&2 ;;
esac

/opt/scripts/prune.sh
