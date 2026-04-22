import { describe, it, expect } from "vitest";
import { formatPKR, parsePKR, roundMoney } from "./index.js";

describe("formatPKR", () => {
  it("formats positive amounts without decimals", () => {
    expect(formatPKR(1500)).toMatch(/1,500/);
  });

  it("wraps negatives in accounting parens", () => {
    const out = formatPKR(-2500);
    expect(out).toMatch(/^\(.*2,500.*\)$/);
  });

  it("returns em dash for null/undefined/NaN", () => {
    expect(formatPKR(null)).toBe("—");
    expect(formatPKR(undefined)).toBe("—");
    expect(formatPKR(Number.NaN)).toBe("—");
  });

  it("accepts numeric strings", () => {
    expect(formatPKR("3500")).toMatch(/3,500/);
  });
});

describe("parsePKR", () => {
  it("strips commas + currency symbols", () => {
    expect(parsePKR("Rs. 1,250.50")).toBe(1250.5);
    expect(parsePKR("PKR 500")).toBe(500);
  });

  it("returns null on empty / garbage", () => {
    expect(parsePKR("")).toBeNull();
    expect(parsePKR("abc")).toBeNull();
  });
});

describe("roundMoney", () => {
  it("rounds to 2 dp", () => {
    expect(roundMoney(1.005)).toBe(1); // JS rounding quirk; document behavior
    expect(roundMoney(1.006)).toBe(1.01);
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(-1.235)).toBe(-1.24);
  });
});
