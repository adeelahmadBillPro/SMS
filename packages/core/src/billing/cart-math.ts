import { roundMoney } from "../money/index";
import type { CartLine, CartTotals, LineTotals, PaymentInput } from "./types";

/**
 * Compute the totals for a cart. Deterministic, no DB calls — the server
 * re-runs this with authoritative prices before committing. Matches the
 * formula users will see on the receipt, so the cashier and the ledger
 * agree to the paisa.
 *
 * Rounding: every intermediate value is rounded to 2 dp. The tax is
 * computed per-line on the *post-discount* taxable base so that bill-level
 * discounts don't alter tax.
 */
export function computeCartTotals(lines: CartLine[], billDiscount = 0): CartTotals {
  const ltotals: LineTotals[] = lines.map((l) => {
    const subtotalBeforeDiscount = roundMoney(l.qty * l.unitPrice);
    const lineDiscount = roundMoney(Math.min(Math.max(l.discount, 0), subtotalBeforeDiscount));
    const taxableBase = roundMoney(subtotalBeforeDiscount - lineDiscount);
    const tax = roundMoney((taxableBase * Math.max(l.taxRate, 0)) / 100);
    const lineTotal = roundMoney(taxableBase + tax);
    return { subtotalBeforeDiscount, lineDiscount, taxableBase, tax, lineTotal };
  });

  const subtotal = roundMoney(ltotals.reduce((a, b) => a + b.taxableBase, 0));
  const lineDiscountTotal = roundMoney(ltotals.reduce((a, b) => a + b.lineDiscount, 0));
  const tax = roundMoney(ltotals.reduce((a, b) => a + b.tax, 0));

  const billDiscountClamped = roundMoney(Math.min(Math.max(billDiscount, 0), subtotal));
  const total = roundMoney(subtotal + tax - billDiscountClamped);

  return {
    lines: ltotals,
    subtotal,
    lineDiscountTotal,
    billDiscount: billDiscountClamped,
    tax,
    total: Math.max(0, total),
  };
}

/**
 * Amount tendered via non-credit methods.
 */
export function sumPayments(payments: PaymentInput[]): number {
  return roundMoney(
    payments
      .filter((p) => p.method !== "CREDIT")
      .reduce((a, b) => a + Math.max(0, b.amount), 0),
  );
}

export interface ReconciliationResult {
  ok: boolean;
  paid: number;
  creditAmount: number;
  total: number;
  shortfall: number; // total - (paid + credit); positive means under-paid
}

/**
 * Verify invariant I2: sum(payments) + credit_amount = sale.total.
 *
 * Any mismatch > 1 paisa is rejected. Over-tender (cashier gives change) is
 * handled upstream by capping paid at total — this function assumes the
 * caller has already done that.
 */
export function reconcile(
  total: number,
  payments: PaymentInput[],
  creditAmount: number,
): ReconciliationResult {
  const paid = sumPayments(payments);
  const credit = roundMoney(Math.max(0, creditAmount));
  const shortfall = roundMoney(total - paid - credit);
  return {
    ok: Math.abs(shortfall) < 0.01,
    paid,
    creditAmount: credit,
    total: roundMoney(total),
    shortfall,
  };
}

/**
 * Credit-limit guard per SPEC §6. `outstanding` is what the customer already
 * owes; `creditLimit` is their ceiling. Returns false to block.
 */
export function withinCreditLimit(
  outstanding: number,
  newCreditAmount: number,
  creditLimit: number,
): boolean {
  if (newCreditAmount <= 0) return true;
  return roundMoney(outstanding + newCreditAmount) <= roundMoney(creditLimit);
}
