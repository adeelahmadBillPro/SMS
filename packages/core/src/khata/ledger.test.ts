import { describe, it, expect } from "vitest";
import { assertBalanced } from "../billing/ledger";
import {
  buildPurchaseLedgerLines,
  buildCustomerOnAccountPaymentLedgerLines,
  buildSupplierOnAccountPaymentLedgerLines,
} from "./ledger";

describe("buildPurchaseLedgerLines", () => {
  it("cash purchase — debit Purchases, credit Cash, balanced", () => {
    const lines = buildPurchaseLedgerLines({
      total: 10_000,
      payments: [{ method: "CASH", amount: 10_000 }],
      creditToSupplier: 0,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines.find((l) => l.accountCode === "5000")?.debit).toBe(10_000);
    expect(lines.find((l) => l.accountCode === "1000")?.credit).toBe(10_000);
  });

  it("credit purchase — debit Purchases, credit Supplier Payables, balanced", () => {
    const lines = buildPurchaseLedgerLines({
      total: 50_000,
      payments: [],
      creditToSupplier: 50_000,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines.find((l) => l.accountCode === "2000")?.credit).toBe(50_000);
  });

  it("partial payment — split Cash + Payables, balanced", () => {
    const lines = buildPurchaseLedgerLines({
      total: 30_000,
      payments: [{ method: "CASH", amount: 10_000 }],
      creditToSupplier: 20_000,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines.find((l) => l.accountCode === "5000")?.debit).toBe(30_000);
    expect(lines.find((l) => l.accountCode === "1000")?.credit).toBe(10_000);
    expect(lines.find((l) => l.accountCode === "2000")?.credit).toBe(20_000);
  });
});

describe("buildCustomerOnAccountPaymentLedgerLines", () => {
  it("cash receipt — debit Cash, credit Receivables, balanced", () => {
    const lines = buildCustomerOnAccountPaymentLedgerLines({ method: "CASH", amount: 1_500 });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines[0]?.debit).toBe(1_500);
    expect(lines[0]?.accountCode).toBe("1000");
    expect(lines[1]?.credit).toBe(1_500);
    expect(lines[1]?.accountCode).toBe("1200");
  });

  it("skips when method is CREDIT (nonsensical for receipt)", () => {
    const lines = buildCustomerOnAccountPaymentLedgerLines({ method: "CREDIT", amount: 100 });
    expect(lines).toEqual([]);
  });

  it("skips zero amounts", () => {
    expect(buildCustomerOnAccountPaymentLedgerLines({ method: "CASH", amount: 0 })).toEqual([]);
  });
});

describe("buildSupplierOnAccountPaymentLedgerLines", () => {
  it("cash payment — debit Payables, credit Cash, balanced", () => {
    const lines = buildSupplierOnAccountPaymentLedgerLines({ method: "CASH", amount: 8_000 });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines[0]?.accountCode).toBe("2000");
    expect(lines[0]?.debit).toBe(8_000);
    expect(lines[1]?.accountCode).toBe("1000");
    expect(lines[1]?.credit).toBe(8_000);
  });

  it("uses 1100 (Bank) for digital wallets", () => {
    const lines = buildSupplierOnAccountPaymentLedgerLines({ method: "JAZZCASH", amount: 500 });
    expect(lines[1]?.accountCode).toBe("1100");
  });
});
