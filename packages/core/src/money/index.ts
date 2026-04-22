/**
 * Money helpers. PKR has no subunits for display, but storage is DECIMAL(14,2)
 * to keep the door open to other currencies later and to avoid float error
 * creeping in through averages / tax calcs.
 *
 * Internally we work with strings (what Prisma returns for Decimal columns
 * when the client is configured that way) or numbers — never floats for
 * arithmetic that must round.
 */

/** Format a number/string amount as PKR for display. No decimals, accounting parens for negatives. */
export function formatPKR(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const abs = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
  return n < 0 ? `(${abs})` : abs;
}

/** Parse a user-entered PKR string back to a number. Handles "Rs. 1,250.50",
 *  "PKR 500", "-3000", etc. Returns null on failure. */
export function parsePKR(raw: string): number | null {
  if (!raw) return null;
  const match = raw.match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Round to 2 dp (paise) — money arithmetic should funnel through this. */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
