import { roundMoney } from "../money/index";
import type { PurchaseLine, PurchaseLineTotals, PurchaseTotals } from "./types";

/**
 * Purchase side of the inventory cost equation. Tax is added on top (no
 * line-level discount in P0 — suppliers give a bulk negotiated unit_cost,
 * and a rebate is handled as a supplier credit note later).
 *
 * Matches the purchase schema: Purchase has subtotal / tax / total columns
 * and PurchaseItem has line_total. We compute both here and pass them to
 * the server action, which re-validates.
 */
export function computePurchaseTotals(lines: PurchaseLine[]): PurchaseTotals {
  const ltotals: PurchaseLineTotals[] = lines.map((l) => {
    const subtotalBeforeTax = roundMoney(l.qty * l.unitCost);
    const tax = roundMoney((subtotalBeforeTax * Math.max(l.taxRate, 0)) / 100);
    const lineTotal = roundMoney(subtotalBeforeTax + tax);
    return { subtotalBeforeTax, tax, lineTotal };
  });

  const subtotal = roundMoney(ltotals.reduce((a, b) => a + b.subtotalBeforeTax, 0));
  const tax = roundMoney(ltotals.reduce((a, b) => a + b.tax, 0));
  const total = roundMoney(subtotal + tax);

  return { lines: ltotals, subtotal, tax, total };
}
