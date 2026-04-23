/**
 * Asia/Karachi day boundaries. PKT = UTC+5 year-round (no DST), so we can
 * compute boundaries by pure arithmetic without pulling in a TZ library.
 *
 * Convention used across queries:
 *   "a PKT day" = `[YYYY-MM-DD 00:00:00 PKT, YYYY-MM-DD 23:59:59.999 PKT]`
 * Stored in UTC as `[YYYY-MM-(DD-1) 19:00:00 UTC, YYYY-MM-DD 18:59:59.999 UTC]`.
 */

export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** The PKT calendar date (YYYY-MM-DD) containing an instant. */
export function pktDateString(instant: Date = new Date()): string {
  const pkt = new Date(instant.getTime() + PKT_OFFSET_MS);
  return pkt.toISOString().slice(0, 10);
}

/** Start and end UTC instants for the PKT day containing `instant`. */
export function pktDayBoundary(instant: Date = new Date()): { start: Date; end: Date } {
  const pkt = new Date(instant.getTime() + PKT_OFFSET_MS);
  const midnightUtc = Date.UTC(
    pkt.getUTCFullYear(),
    pkt.getUTCMonth(),
    pkt.getUTCDate(),
  );
  const start = new Date(midnightUtc - PKT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Given a YYYY-MM-DD string, return the UTC [start, end) for that PKT day. */
export function pktDayBoundaryFromDateString(ymd: string): { start: Date; end: Date } {
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) throw new Error(`Invalid date string: ${ymd}`);
  const midnightUtc = Date.UTC(y, m - 1, d);
  const start = new Date(midnightUtc - PKT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Move `date` forward by one PKT day (useful when listing sequential closings). */
export function addPktDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map((p) => Number(p));
  if (!y || !m || !d) throw new Error(`Invalid date string: ${ymd}`);
  const midnight = Date.UTC(y, m - 1, d);
  const next = new Date(midnight + delta * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

/** PKT calendar date for a stored Date (YYYY-MM-DD, no time). */
export function pktDateOf(instant: Date): string {
  return pktDateString(instant);
}
