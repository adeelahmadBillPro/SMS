import { describe, it, expect } from "vitest";
import { assertBalanced, buildSaleLedgerLines } from "./ledger";

describe("buildSaleLedgerLines (invariant I3)", () => {
  it("cash-only sale, no tax — balanced", () => {
    const lines = buildSaleLedgerLines({
      total: 1000,
      tax: 0,
      payments: [{ method: "CASH", amount: 1000 }],
      creditAmount: 0,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(b.debit).toBe(1000);
    expect(b.credit).toBe(1000);
    expect(lines.find((l) => l.accountCode === "1000")).toBeDefined();
    expect(lines.find((l) => l.accountCode === "4000")).toBeDefined();
  });

  it("cash + tax — balanced, tax goes to 2100", () => {
    const lines = buildSaleLedgerLines({
      total: 1180,
      tax: 180,
      payments: [{ method: "CASH", amount: 1180 }],
      creditAmount: 0,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    const tax = lines.find((l) => l.accountCode === "2100");
    expect(tax?.credit).toBe(180);
    const sales = lines.find((l) => l.accountCode === "4000");
    expect(sales?.credit).toBe(1000);
  });

  it("split payment: cash + jazzcash + credit — balanced", () => {
    const lines = buildSaleLedgerLines({
      total: 5000,
      tax: 0,
      payments: [
        { method: "CASH", amount: 2000 },
        { method: "JAZZCASH", amount: 1000 },
      ],
      creditAmount: 2000,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines.find((l) => l.accountCode === "1000")?.debit).toBe(2000);
    expect(lines.find((l) => l.accountCode === "1100")?.debit).toBe(1000);
    expect(lines.find((l) => l.accountCode === "1200")?.debit).toBe(2000);
    expect(lines.find((l) => l.accountCode === "4000")?.credit).toBe(5000);
  });

  it("pure credit sale — receivable debit, sales credit, balanced", () => {
    const lines = buildSaleLedgerLines({
      total: 3000,
      tax: 0,
      payments: [],
      creditAmount: 3000,
    });
    const b = assertBalanced(lines);
    expect(b.balanced).toBe(true);
    expect(lines.find((l) => l.accountCode === "1200")?.debit).toBe(3000);
  });

  it("zero-amount payments are skipped", () => {
    const lines = buildSaleLedgerLines({
      total: 500,
      tax: 0,
      payments: [{ method: "CASH", amount: 0 }],
      creditAmount: 500,
    });
    expect(lines.find((l) => l.accountCode === "1000")).toBeUndefined();
  });
});
