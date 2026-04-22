import { roundMoney } from "../money/index";
import type { CartTotals, PaymentInput, PaymentMethodCode } from "./types";

/**
 * A single debit/credit line destined for the ledger_entry table. We build
 * these in-memory from the cart + payments, then the Server Action writes
 * them in the same transaction as the sale itself. Invariant I3 (sum(debit)
 * per day == sum(credit)) holds by construction: every entry below balances
 * within this function.
 */
export interface LedgerLine {
  accountCode: AccountCode;
  debit: number;
  credit: number;
  memo?: string;
}

/**
 * Seeded chart-of-accounts codes used across sale + purchase + payment
 * flows. See apps/web/src/app/onboarding/action.ts for the full list.
 */
export type AccountCode =
  | "1000" // Cash
  | "1100" // Bank
  | "1200" // Customer Receivables
  | "2000" // Supplier Payables
  | "2100" // Tax Payable
  | "3000" // Owner Equity
  | "4000" // Sales
  | "5000" // Purchases
  | "6000"; // Expenses

export interface SaleLedgerInput {
  total: number;
  tax: number;
  payments: PaymentInput[];
  creditAmount: number;
}

/**
 * Translate a sale into balanced double-entry lines.
 *
 *   DEBIT
 *     Cash / Bank / JazzCash* / Easypaisa* / Card* / Cheque* / Receivables
 *     (each payment posts to the appropriate asset; credit amount posts to Receivables)
 *   CREDIT
 *     Sales (total - tax)
 *     Tax Payable (tax)
 *
 * *JazzCash/Easypaisa/Card/Cheque currently all land in Bank for P0. A
 *  dedicated mobile-wallet account comes in Phase 2 when we reconcile
 *  settlement reports.
 */
export function buildSaleLedgerLines(input: SaleLedgerInput): LedgerLine[] {
  const { total, tax, payments, creditAmount } = input;
  const salesAmount = roundMoney(total - tax);

  const lines: LedgerLine[] = [];

  for (const p of payments) {
    const acct = paymentAccount(p.method);
    if (p.method === "CREDIT" || p.amount <= 0) continue;
    lines.push({
      accountCode: acct,
      debit: roundMoney(p.amount),
      credit: 0,
      memo: `Payment (${p.method})`,
    });
  }
  if (creditAmount > 0) {
    lines.push({
      accountCode: "1200",
      debit: roundMoney(creditAmount),
      credit: 0,
      memo: "Credit sale (receivable)",
    });
  }
  if (salesAmount > 0) {
    lines.push({
      accountCode: "4000",
      debit: 0,
      credit: salesAmount,
      memo: "Sale",
    });
  }
  if (tax > 0) {
    lines.push({
      accountCode: "2100",
      debit: 0,
      credit: roundMoney(tax),
      memo: "Sales tax collected",
    });
  }

  return lines;
}

function paymentAccount(method: PaymentMethodCode): AccountCode {
  switch (method) {
    case "CASH":
      return "1000";
    case "BANK":
    case "JAZZCASH":
    case "EASYPAISA":
    case "CARD":
    case "CHEQUE":
      return "1100";
    case "CREDIT":
      return "1200";
  }
}

export interface LedgerBalanceCheck {
  debit: number;
  credit: number;
  balanced: boolean;
}

/** Invariant I3 check for a single set of lines (e.g. a sale). */
export function assertBalanced(lines: LedgerLine[]): LedgerBalanceCheck {
  const debit = roundMoney(lines.reduce((a, l) => a + l.debit, 0));
  const credit = roundMoney(lines.reduce((a, l) => a + l.credit, 0));
  return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 };
}

export function cartToSaleLedgerInput(
  totals: CartTotals,
  payments: PaymentInput[],
  creditAmount: number,
): SaleLedgerInput {
  return {
    total: totals.total,
    tax: totals.tax,
    payments,
    creditAmount,
  };
}
