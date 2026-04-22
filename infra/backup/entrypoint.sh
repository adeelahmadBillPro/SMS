#!/bin/sh
set -eu

CRON="${BACKUP_CRON:-0 22 * * *}"
CRONFILE="/tmp/crontab"

# supercronic expects "<cron expression> <command>" per line.
printf "%s /opt/scripts/pg_dump.sh >> /proc/1/fd/1 2>> /proc/1/fd/2\n" "$CRON" > "$CRONFILE"

echo "[backup] entrypoint: schedule='$CRON', dir=/var/backups/shopos"
echo "[backup] entrypoint: remote=${BACKUP_REMOTE:-none}"

# Run one dump at boot so we always have a fresh artefact after (re)deploys
# — catches credential/connectivity issues early instead of waiting until
# the next scheduled run.
/opt/scripts/pg_dump.sh || echo "[backup] initial dump failed (continuing)"

exec /usr/local/bin/supercronic "$CRONFILE"
