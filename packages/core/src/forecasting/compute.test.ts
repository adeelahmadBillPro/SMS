import { describe, it, expect } from "vitest";
import { computeForecast } from "./compute";

describe("computeForecast — SPEC §9", () => {
  it("steady seller, plenty of stock — no reorder", () => {
    const f = computeForecast({
      qtySoldLast7d: 14,
      qtySoldLast30d: 60,
      qtySoldLast60d: 120,
      currentStock: 100,
      leadTimeDays: 7,
    });
    expect(f.avgDailySales7d).toBe(2);
    expect(f.avgDailySales30d).toBe(2);
    // reorder_point = ceil(2*7) + ceil(2*2) = 14 + 4 = 18
    expect(f.reorderPoint).toBe(18);
    expect(f.reorderSuggested).toBe(false);
    expect(f.isDeadStock).toBe(false);
    // days_of_stock_remaining = 100 / 2 = 50
    expect(f.daysOfStockRemaining).toBe(50);
  });

  it("below reorder point — suggest reorder", () => {
    const f = computeForecast({
      qtySoldLast7d: 14,
      qtySoldLast30d: 60,
      qtySoldLast60d: 120,
      currentStock: 10,
      leadTimeDays: 7,
    });
    expect(f.reorderSuggested).toBe(true);
    // target_30d = ceil(2*30) = 60; suggested = 60 - 10 = 50
    expect(f.suggestedReorderQty).toBe(50);
  });

  it("no sales in 60 days + current stock > 0 = dead stock", () => {
    const f = computeForecast({
      qtySoldLast7d: 0,
      qtySoldLast30d: 0,
      qtySoldLast60d: 0,
      currentStock: 5,
      leadTimeDays: 7,
    });
    expect(f.isDeadStock).toBe(true);
    // avg_daily_sales_7d = 0 → reorder_suggested must be false even when stock is low
    expect(f.reorderSuggested).toBe(false);
  });

  it("no sales + zero stock = neither dead nor reorder", () => {
    const f = computeForecast({
      qtySoldLast7d: 0,
      qtySoldLast30d: 0,
      qtySoldLast60d: 0,
      currentStock: 0,
      leadTimeDays: 7,
    });
    expect(f.isDeadStock).toBe(false);
    expect(f.reorderSuggested).toBe(false);
  });

  it("stock at reorder point triggers suggestion", () => {
    const f = computeForecast({
      qtySoldLast7d: 7,
      qtySoldLast30d: 28,
      qtySoldLast60d: 56,
      currentStock: 9, // reorder_point = ceil(1*7)+ceil(1*2)=7+2=9
      leadTimeDays: 7,
    });
    expect(f.reorderPoint).toBe(9);
    expect(f.reorderSuggested).toBe(true);
  });

  it("negative input defended against", () => {
    const f = computeForecast({
      qtySoldLast7d: -5,
      qtySoldLast30d: -10,
      qtySoldLast60d: -20,
      currentStock: -3, // from a broken movement; guard clamps to 0
      leadTimeDays: -1,
    });
    expect(f.avgDailySales7d).toBe(0);
    expect(f.currentStock).toBe(0);
    expect(f.reorderSuggested).toBe(false);
  });

  it("days remaining is huge (but finite) when avg sales near zero", () => {
    const f = computeForecast({
      qtySoldLast7d: 0,
      qtySoldLast30d: 0,
      qtySoldLast60d: 0,
      currentStock: 100,
      leadTimeDays: 7,
    });
    expect(f.daysOfStockRemaining).toBe(10000); // 100 / 0.01
    expect(Number.isFinite(f.daysOfStockRemaining)).toBe(true);
  });
});
