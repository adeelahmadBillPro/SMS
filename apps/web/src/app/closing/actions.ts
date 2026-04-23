"use server";

import { revalidatePath } from "next/cache";
import { withShop } from "@shopos/db";
import { Closing } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";
import { getDaySnapshot } from "./queries";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T> = Ok<T> | Err;

function zErr(err: import("zod").ZodError): Err {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(i.message);
  }
  return { ok: false, error: err.issues[0]?.message ?? "Invalid input", fieldErrors };
}

/**
 * Close the PKT day. Captures the expected-vs-actual snapshot at the moment
 * of close and freezes the ledger for that date — from this point on any
 * Server Action that hits assertDayOpen() will reject writes dated on or
 * before the closing.
 */
export async function closeDayAction(input: unknown): Promise<Result<{ closingId: string; date: string }>> {
  const parsed = Closing.closeDaySchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);

  const { session, membership } = await requireShop();
  const shopId = membership.shopId;

  // Re-fetch the snapshot server-side so the expected cash on the button
  // press matches the one the Closing row stores.
  const snap = await getDaySnapshot(shopId, parsed.data.closingDate);

  try {
    const closing = await withShop(shopId, async (tx) => {
      // Reject if already closed (the unique index would do it too, but a
      // friendly message beats a Postgres error string).
      const existing = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM closing WHERE closing_date = to_date($1, 'YYYY-MM-DD')`,
        parsed.data.closingDate,
      );
      if (existing.length > 0) throw new Error("This day is already closed.");

      const variance = Closing.computeVariance(parsed.data.actualCash, snap.expected.expectedCash);
      const midnightForDate = Closing.pktDayBoundaryFromDateString(parsed.data.closingDate).end;
      // Store closing_date as midnight (DATE column); use boundary.end -1ms = day end
      // Actually a DATE column drops the time part, so any valid UTC date works.
      const closedAt = new Date();
      void midnightForDate;

      return tx.closing.create({
        data: {
          shopId,
          closingDate: new Date(`${parsed.data.closingDate}T00:00:00.000Z`),
          openingCash: snap.openingCash,
          expectedCash: snap.expected.expectedCash,
          actualCash: parsed.data.actualCash,
          variance,
          notes: parsed.data.notes ?? null,
          closedBy: session.userId,
          closedAt,
        },
        select: { id: true },
      });
    });
    revalidatePath("/closing");
    revalidatePath(`/closing/${parsed.data.closingDate}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { closingId: closing.id, date: parsed.data.closingDate } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Closing failed" };
  }
}
