import { roundMoney } from "../money/index";
import type { LedgerLine, AccountCode } from "../billing/ledger";
import type { PaymentLeg } from "./types";
import type { PaymentMethodCode } from "../billing/types";

function paymentAsset(method: PaymentMethodCode): AccountCode {
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
      return "2000"; // supplier payables (purchase-time) or 1200 (customer-time); handled per-context below
  }
}

/**
 * Ledger lines for a purchase receipt.
 *   DEBIT  Purchases (5000)           total (tax-inclusive; input-tax reclaim is Phase 2)
 *   CREDIT Cash/Bank/… (1000/1100)     sum of non-credit payments
 *   CREDIT Supplier Payables (2000)    remaining amount (what we still owe)
 *
 * Kept tax-inclusive in 5000 so small shops that aren't tax-registered
 * don't need a separate input-tax asset account. Week-7 FBR work will
 * split this when tax-reclaim is enabled.
 */
export function buildPurchaseLedgerLines(args: {
  total: number;
  payments: PaymentLeg[];
  creditToSupplier: number; // amount left owing after immediate payments
}): LedgerLine[] {
  const { total, payments, creditToSupplier } = args;
  const lines: LedgerLine[] = [];
  if (total > 0) {
    lines.push({
      accountCode: "5000",
      debit: roundMoney(total),
      credit: 0,
      memo: "Purchase",
    });
  }
  for (const p of payments) {
    if (p.method === "CREDIT" || p.amount <= 0) continue;
    lines.push({
      accountCode: paymentAsset(p.method),
      debit: 0,
      credit: roundMoney(p.amount),
      memo: `Paid supplier (${p.method})`,
    });
  }
  if (creditToSupplier > 0) {
    lines.push({
      accountCode: "2000",
      debit: 0,
      credit: roundMoney(creditToSupplier),
      memo: "Supplier payable (purchase on credit)",
    });
  }
  return lines;
}

/**
 * Ledger lines for a customer paying off their on-account balance.
 *   DEBIT  Cash/Bank
 *   CREDIT Customer Receivables (1200)
 *
 * Invariant: only ONE asset account is affected per call (the method picked).
 */
export function buildCustomerOnAccountPaymentLedgerLines(args: {
  method: PaymentMethodCode;
  amount: number;
}): LedgerLine[] {
  const { method, amount } = args;
  if (amount <= 0 || method === "CREDIT") return [];
  return [
    { accountCode: paymentAsset(method), debit: roundMoney(amount), credit: 0, memo: "Customer payment received" },
    { accountCode: "1200", debit: 0, credit: roundMoney(amount), memo: "Reduce receivable" },
  ];
}

/**
 * Ledger lines for paying a supplier's outstanding balance (on-account).
 *   DEBIT  Supplier Payables (2000)
 *   CREDIT Cash/Bank
 */
export function buildSupplierOnAccountPaymentLedgerLines(args: {
  method: PaymentMethodCode;
  amount: number;
}): LedgerLine[] {
  const { method, amount } = args;
  if (amount <= 0 || method === "CREDIT") return [];
  return [
    { accountCode: "2000", debit: roundMoney(amount), credit: 0, memo: "Reduce supplier payable" },
    { accountCode: paymentAsset(method), debit: 0, credit: roundMoney(amount), memo: "Supplier paid" },
  ];
}
