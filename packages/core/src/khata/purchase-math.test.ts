import { describe, it, expect } from "vitest";
import { computePurchaseTotals } from "./purchase-math";
import type { PurchaseLine } from "./types";

function line(overrides: Partial<PurchaseLine> = {}): PurchaseLine {
  return {
    productId: "p-1",
    productName: "Item",
    sku: "SKU-1",
    qty: 1,
    unitCost: 100,
    taxRate: 0,
    ...overrides,
  };
}

describe("computePurchaseTotals", () => {
  it("sums qty * unitCost with zero tax", () => {
    const t = computePurchaseTotals([line({ qty: 5, unitCost: 120 })]);
    expect(t.subtotal).toBe(600);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(600);
  });

  it("adds tax on top", () => {
    const t = computePurchaseTotals([line({ qty: 1, unitCost: 1000, taxRate: 18 })]);
    expect(t.subtotal).toBe(1000);
    expect(t.tax).toBe(180);
    expect(t.total).toBe(1180);
  });

  it("rounds per-line before summing", () => {
    const t = computePurchaseTotals([line({ qty: 3, unitCost: 33.33, taxRate: 18 })]);
    expect(t.lines[0]!.subtotalBeforeTax).toBe(99.99);
    expect(t.lines[0]!.tax).toBe(18); // 17.9982 → 18.00
    expect(t.total).toBe(117.99);
  });

  it("multiple lines sum", () => {
    const t = computePurchaseTotals([
      line({ qty: 2, unitCost: 500 }),
      line({ productId: "p-2", qty: 1, unitCost: 200, taxRate: 18 }),
    ]);
    expect(t.subtotal).toBe(1200);
    expect(t.tax).toBe(36);
    expect(t.total).toBe(1236);
  });
});
