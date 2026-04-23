import type { Prisma } from "@shopos/db";
import { Closing } from "@shopos/core";

/**
 * Throws if the PKT day containing `when` has already been closed for
 * this shop. Every money-path Server Action (sale, purchase, payment,
 * expense, adjustment) should call this inside its withShop() block
 * before writing, so closed-day invariants stay enforced.
 *
 * Reads the most-recent non-reversed closing row and compares its
 * closing_date (stored as DATE @@unique per shop_id) against the PKT
 * calendar date of `when`.
 */
export async function assertDayOpen(
  tx: Prisma.TransactionClient,
  when: Date,
): Promise<void> {
  const whenYmd = Closing.pktDateString(when);

  // Prisma's DateTime @db.Date stores at midnight UTC for that date, which
  // is the PKT ymd once we format to YYYY-MM-DD. The closing.closing_date
  // column is scoped by RLS so we don't need shopId in the WHERE here.
  const closings = await tx.$queryRawUnsafe<Array<{ ymd: string }>>(
    `SELECT to_char(closing_date, 'YYYY-MM-DD') AS ymd
       FROM closing
      WHERE reversed_at IS NULL
        AND closing_date = to_date($1, 'YYYY-MM-DD')
      LIMIT 1`,
    whenYmd,
  );
  if (closings.length > 0) {
    throw new Error(
      `The day ${whenYmd} is already closed. Reversing a closed day requires super-admin action.`,
    );
  }
}
