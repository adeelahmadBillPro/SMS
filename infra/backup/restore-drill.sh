#!/bin/sh
# Restore-drill: proves the latest dump restores into a scratch database.
# Run quarterly (and after any backup-path change).
#
# Spins up a throwaway database `shopos_restore_drill` on the SAME Postgres
# instance, restores the most-recent dump into it, runs a few sanity queries,
# and drops the scratch DB.
#
# Safe to run in prod — it only creates/drops `shopos_restore_drill`.

set -eu

DIR="/var/backups/shopos"
SCRATCH="shopos_restore_drill"

LATEST="$(ls -1t "$DIR"/shopos_*.dump 2>/dev/null | head -n1)"
if [ -z "$LATEST" ]; then
  echo "[drill] no dump in $DIR — nothing to restore" >&2
  exit 2
fi

echo "[drill] restoring $LATEST -> $SCRATCH"

export PGPASSWORD="$PGPASSWORD"

# Drop any prior scratch DB and recreate empty.
psql -h "$PGHOST" -U "$PGUSER" -d postgres \
  -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${SCRATCH};"
psql -h "$PGHOST" -U "$PGUSER" -d postgres \
  -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${SCRATCH};"

# Restore with parallel jobs; --no-owner tolerates role differences.
pg_restore \
  --host="$PGHOST" --username="$PGUSER" --dbname="$SCRATCH" \
  --no-owner --no-acl --jobs=2 --exit-on-error \
  "$LATEST"

# Sanity: at least the shop + plan tables should be present and non-empty.
psql -h "$PGHOST" -U "$PGUSER" -d "$SCRATCH" \
  -v ON_ERROR_STOP=1 <<'SQL'
\echo --- tables ---
\dt
\echo --- row counts (smoke) ---
SELECT 'plan' AS table_name, count(*) AS rows FROM plan
UNION ALL SELECT '"User"', count(*) FROM "User"
UNION ALL SELECT 'shop', count(*) FROM shop;
SQL

psql -h "$PGHOST" -U "$PGUSER" -d postgres \
  -v ON_ERROR_STOP=1 -c "DROP DATABASE ${SCRATCH};"

echo "[drill] restore-drill OK"
