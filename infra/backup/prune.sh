#!/bin/sh
# Retention: 14 daily + 8 weekly (Sun) + 6 monthly (1st).
# Anything outside those windows is deleted.
set -eu

DIR="/var/backups/shopos"
RETAIN_DAILY="${BACKUP_RETAIN_DAILY:-14}"
RETAIN_WEEKLY="${BACKUP_RETAIN_WEEKLY:-8}"
RETAIN_MONTHLY="${BACKUP_RETAIN_MONTHLY:-6}"

cd "$DIR" || exit 0

# Daily: keep the N most-recent files outright.
ls -1t shopos_*.dump 2>/dev/null | tail -n "+$((RETAIN_DAILY + 1))" > /tmp/older.txt || true

# For files older than the daily window, keep Sunday dumps for N weeks
# and 1st-of-month dumps for M months.
while IFS= read -r f; do
  ts="${f#shopos_}"; ts="${ts%.dump}"             # 20260421_220000
  date_part="${ts%%_*}"                            # 20260421
  yyyy="${date_part%????}"
  mm="${date_part:4:2}"
  dd="${date_part:6:2}"

  # keep monthlies: first of the month
  if [ "$dd" = "01" ]; then
    mkey="${yyyy}${mm}"
    echo "$mkey $f" >> /tmp/monthlies.txt
    continue
  fi

  # keep weeklies: Sunday (day-of-week = 0 in GNU date)
  dow="$(date -u -d "${yyyy}-${mm}-${dd}" +%u 2>/dev/null || echo 9)"
  if [ "$dow" = "7" ]; then
    echo "$f" >> /tmp/weeklies.txt
    continue
  fi

  # Otherwise, delete it.
  rm -f -- "$f" && echo "[prune] removed $f"
done < /tmp/older.txt

# Trim weeklies to N most-recent
if [ -f /tmp/weeklies.txt ]; then
  sort -r /tmp/weeklies.txt | tail -n "+$((RETAIN_WEEKLY + 1))" | while IFS= read -r f; do
    rm -f -- "$f" && echo "[prune] removed weekly $f"
  done
fi

# Trim monthlies to M most-recent
if [ -f /tmp/monthlies.txt ]; then
  sort -r /tmp/monthlies.txt | tail -n "+$((RETAIN_MONTHLY + 1))" | while IFS= read -r line; do
    f="${line#* }"
    rm -f -- "$f" && echo "[prune] removed monthly $f"
  done
fi

rm -f /tmp/older.txt /tmp/weeklies.txt /tmp/monthlies.txt
