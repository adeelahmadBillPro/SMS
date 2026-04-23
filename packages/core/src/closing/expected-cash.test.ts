import { describe, it, expect } from "vitest";
import { computeExpectedCash, computeVariance } from "./expected-cash";

describe("computeExpectedCash (SPEC §7)", () => {
  it("a bare empty day matches opening cash", () => {
    const r = computeExpectedCash({
      openingCash: 5000,
      cashSales: 0,
      cashOnAccountFromCustomers: 0,
      cashPaidOnPurchase: 0,
      cashOnAccountToSuppliers: 0,
      cashExpenses: 0,
    });
    expect(r.expected).toBe(5000);
    expect(r.inflow).toBe(0);
    expect(r.outflow).toBe(0);
  });

  it("adds cash sales + customer receipts", () => {
    const r = computeExpectedCash({
      openingCash: 10_000,
      cashSales: 3_000,
      cashOnAccountFromCustomers: 1_500,
      cashPaidOnPurchase: 0,
      cashOnAccountToSuppliers: 0,
      cashExpenses: 0,
    });
    expect(r.inflow).toBe(4_500);
    expect(r.expected).toBe(14_500);
  });

  it("subtracts purchase-time cash + supplier on-account + expenses", () => {
    const r = computeExpectedCash({
      openingCash: 20_000,
      cashSales: 5_000,
      cashOnAccountFromCustomers: 0,
      cashPaidOnPurchase: 3_000,
      cashOnAccountToSuppliers: 2_000,
      cashExpenses: 500,
    });
    expect(r.outflow).toBe(5_500);
    expect(r.expected).toBe(19_500);
  });

  it("can go negative (bad day)", () => {
    const r = computeExpectedCash({
      openingCash: 1_000,
      cashSales: 0,
      cashOnAccountFromCustomers: 0,
      cashPaidOnPurchase: 0,
      cashOnAccountToSuppliers: 0,
      cashExpenses: 5_000,
    });
    expect(r.expected).toBe(-4_000);
  });

  it("rounds every step to 2 dp", () => {
    const r = computeExpectedCash({
      openingCash: 0.1,
      cashSales: 0.2,
      cashOnAccountFromCustomers: 0,
      cashPaidOnPurchase: 0,
      cashOnAccountToSuppliers: 0,
      cashExpenses: 0,
    });
    expect(r.expected).toBe(0.3);
  });
});

describe("computeVariance", () => {
  it("positive means cashier had MORE than expected (over)", () => {
    expect(computeVariance(5100, 5000)).toBe(100);
  });
  it("negative means cashier is SHORT", () => {
    expect(computeVariance(4800, 5000)).toBe(-200);
  });
});
