import { describe, it, expect } from "vitest";
import {
  currentQtyFromMovements,
  inStockCount,
  checkSerializedStockInvariant,
  wouldGoNegative,
} from "./stock-level.js";

describe("currentQtyFromMovements", () => {
  const P = "11111111-1111-1111-1111-111111111111";
  const Q = "22222222-2222-2222-2222-222222222222";

  it("sums deltas for the requested product only", () => {
    const m = [
      { productId: P, qtyDelta: 10 },
      { productId: P, qtyDelta: -3 },
      { productId: Q, qtyDelta: 5 },
    ];
    expect(currentQtyFromMovements(m, { productId: P })).toBe(7);
    expect(currentQtyFromMovements(m, { productId: Q })).toBe(5);
  });

  it("filters by variant when requested", () => {
    const V1 = "var-1";
    const V2 = "var-2";
    const m = [
      { productId: P, variantId: V1, qtyDelta: 4 },
      { productId: P, variantId: V2, qtyDelta: 6 },
      { productId: P, variantId: V1, qtyDelta: -1 },
    ];
    expect(currentQtyFromMovements(m, { productId: P, variantId: V1 })).toBe(3);
    expect(currentQtyFromMovements(m, { productId: P, variantId: V2 })).toBe(6);
  });

  it("counts variantId=null bucket separately when caller filters on a variant", () => {
    const V = "var-1";
    const m = [
      { productId: P, variantId: null, qtyDelta: 3 },
      { productId: P, variantId: V, qtyDelta: 5 },
    ];
    expect(currentQtyFromMovements(m, { productId: P, variantId: V })).toBe(5);
  });

  it("handles zero movements", () => {
    expect(currentQtyFromMovements([], { productId: P })).toBe(0);
  });
});

describe("inStockCount", () => {
  const P = "prod-a";
  it("counts only IN_STOCK rows", () => {
    const items = [
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "SOLD" as const },
      { productId: P, status: "DAMAGED" as const },
    ];
    expect(inStockCount(items, { productId: P })).toBe(2);
  });
});

describe("checkSerializedStockInvariant", () => {
  it("returns empty when sums match counts", () => {
    const P = "prod-a";
    const movements = [
      { productId: P, qtyDelta: 3 },
      { productId: P, qtyDelta: -1 },
    ];
    const items = [
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "SOLD" as const },
    ];
    expect(checkSerializedStockInvariant(movements, items)).toEqual([]);
  });

  it("flags mismatch between qty rollup and stock_item count", () => {
    const P = "prod-drift";
    const movements = [{ productId: P, qtyDelta: 2 }];
    const items = [
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "IN_STOCK" as const },
      { productId: P, status: "IN_STOCK" as const },
    ];
    const violations = checkSerializedStockInvariant(movements, items);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      productId: P,
      qtyFromMovements: 2,
      inStockCount: 3,
    });
  });
});

describe("wouldGoNegative", () => {
  it("blocks negative when shop disallows it", () => {
    expect(wouldGoNegative(2, -3, false)).toBe(true);
    expect(wouldGoNegative(2, -2, false)).toBe(false);
  });

  it("permits negative when shop allows it", () => {
    expect(wouldGoNegative(2, -10, true)).toBe(false);
  });
});
