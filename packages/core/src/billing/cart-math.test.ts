import { describe, it, expect } from "vitest";
import { computeCartTotals, reconcile, sumPayments, withinCreditLimit } from "./cart-math";
import type { CartLine } from "./types";

function line(overrides: Partial<CartLine> = {}): CartLine {
  return {
    productId: "p-1",
    productName: "Item",
    sku: "SKU-1",
    qty: 1,
    unitPrice: 100,
    unitCost: 50,
    discount: 0,
    taxRate: 0,
    ...overrides,
  };
}

describe("computeCartTotals", () => {
  it("sums qty * unitPrice into subtotal with zero discount/tax", () => {
    const t = computeCartTotals([line({ qty: 2, unitPrice: 150 })]);
    expect(t.subtotal).toBe(300);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(300);
  });

  it("applies per-line discount before tax", () => {
    const t = computeCartTotals([line({ qty: 2, unitPrice: 100, discount: 50, taxRate: 18 })]);
    // subtotalBeforeDiscount = 200, lineDiscount = 50, taxableBase = 150
    // tax = 150 * 0.18 = 27, lineTotal = 177
    expect(t.lines[0]).toMatchObject({ taxableBase: 150, tax: 27, lineTotal: 177 });
    expect(t.subtotal).toBe(150);
    expect(t.tax).toBe(27);
    expect(t.total).toBe(177);
  });

  it("applies bill-level discount *after* tax is computed per line", () => {
    // Two lines, each 100 @ 18% tax: subtotal 200, tax 36. Bill discount 20.
    // total = 200 + 36 - 20 = 216
    const lines = [
      line({ unitPrice: 100, taxRate: 18 }),
      line({ productId: "p-2", unitPrice: 100, taxRate: 18 }),
    ];
    const t = computeCartTotals(lines, 20);
    expect(t.subtotal).toBe(200);
    expect(t.tax).toBe(36);
    expect(t.billDiscount).toBe(20);
    expect(t.total).toBe(216);
  });

  it("clamps bill discount to subtotal + tax", () => {
    const t = computeCartTotals([line({ unitPrice: 50 })], 9999);
    expect(t.total).toBe(0);
  });

  it("clamps line discount to line gross", () => {
    const t = computeCartTotals([line({ qty: 1, unitPrice: 100, discount: 500 })]);
    expect(t.lines[0]!.lineDiscount).toBe(100);
    expect(t.total).toBe(0);
  });

  it("never returns negative total", () => {
    const t = computeCartTotals([line({ unitPrice: 10 })], 9999);
    expect(t.total).toBeGreaterThanOrEqual(0);
  });

  it("rounds each intermediate to 2 dp", () => {
    // 3 * 33.33 = 99.99; 18% tax = 17.9982 → 18.00
    const t = computeCartTotals([line({ qty: 3, unitPrice: 33.33, taxRate: 18 })]);
    expect(t.lines[0]!.taxableBase).toBe(99.99);
    expect(t.lines[0]!.tax).toBe(18); // 17.9982 rounds to 18.00
    expect(t.total).toBe(117.99);
  });
});

describe("sumPayments", () => {
  it("ignores credit payments", () => {
    expect(
      sumPayments([
        { method: "CASH", amount: 500 },
        { method: "CREDIT", amount: 200 },
        { method: "JAZZCASH", amount: 300 },
      ]),
    ).toBe(800);
  });
});

describe("reconcile (invariant I2)", () => {
  it("passes when payments + credit == total", () => {
    const r = reconcile(1000, [{ method: "CASH", amount: 700 }], 300);
    expect(r.ok).toBe(true);
    expect(r.shortfall).toBe(0);
  });

  it("fails when total is under-paid", () => {
    const r = reconcile(1000, [{ method: "CASH", amount: 500 }], 0);
    expect(r.ok).toBe(false);
    expect(r.shortfall).toBe(500);
  });

  it("fails when over-paid by > 1 paisa", () => {
    const r = reconcile(100, [{ method: "CASH", amount: 200 }], 0);
    expect(r.ok).toBe(false);
    expect(r.shortfall).toBe(-100);
  });

  it("tolerates floating-point drift under 1 paisa", () => {
    const r = reconcile(100, [{ method: "CASH", amount: 99.999 }], 0);
    expect(r.ok).toBe(true);
  });
});

describe("withinCreditLimit (SPEC §6 credit guard)", () => {
  it("permits when outstanding + new credit <= limit", () => {
    expect(withinCreditLimit(4000, 1000, 5000)).toBe(true);
    expect(withinCreditLimit(0, 5000, 5000)).toBe(true);
  });

  it("blocks when the sum would exceed the limit", () => {
    expect(withinCreditLimit(4500, 1000, 5000)).toBe(false);
  });

  it("permits any non-credit sale regardless of outstanding", () => {
    expect(withinCreditLimit(99999, 0, 0)).toBe(true);
  });
});
