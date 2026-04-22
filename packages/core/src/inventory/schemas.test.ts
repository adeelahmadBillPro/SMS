import { describe, it, expect } from "vitest";
import {
  createProductSchema,
  createVariantSchema,
  receiveStockSchema,
  adjustStockSchema,
} from "./schemas.js";

// Valid v4 UUID (version nibble = 4, variant nibble in 8..b).
const uuid = "11111111-1111-4111-8111-111111111111";

describe("createProductSchema", () => {
  it("accepts a minimum valid product", () => {
    const r = createProductSchema.safeParse({
      sku: "PHN-001",
      name: "Redmi 13C",
      category: "MOBILE",
      hasImei: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.unit).toBe("pcs");
      expect(r.data.cost).toBe(0);
    }
  });

  it("coerces money strings to rounded numbers", () => {
    const r = createProductSchema.parse({
      sku: "X",
      name: "Test",
      category: "ACCESSORY",
      cost: "1,250.499",
      price: "1,500",
    });
    expect(r.cost).toBe(1250.5);
    expect(r.price).toBe(1500);
  });

  it("rejects negative money", () => {
    const r = createProductSchema.safeParse({
      sku: "X",
      name: "T",
      category: "ACCESSORY",
      cost: "-1",
    });
    expect(r.success).toBe(false);
  });

  it("requires IMEI or serial for MOBILE", () => {
    const r = createProductSchema.safeParse({
      sku: "X",
      name: "T",
      category: "MOBILE",
      hasImei: false,
      hasSerial: false,
    });
    expect(r.success).toBe(false);
  });

  it("trims name + sku", () => {
    const r = createProductSchema.parse({
      sku: "  PHN-1 ",
      name: "  Phone  ",
      category: "ACCESSORY",
    });
    expect(r.sku).toBe("PHN-1");
    expect(r.name).toBe("Phone");
  });
});

describe("createVariantSchema", () => {
  it("requires at least one of color / storage / ram", () => {
    const r = createVariantSchema.safeParse({ productId: uuid });
    expect(r.success).toBe(false);
  });

  it("accepts color-only", () => {
    const r = createVariantSchema.safeParse({
      productId: uuid,
      color: "Black",
    });
    expect(r.success).toBe(true);
  });
});

describe("receiveStockSchema", () => {
  it("requires qty >= 1", () => {
    const r = receiveStockSchema.safeParse({
      productId: uuid,
      qty: 0,
      unitCost: 100,
    });
    expect(r.success).toBe(false);
  });

  it("requires imei count to match qty when provided", () => {
    const r = receiveStockSchema.safeParse({
      productId: uuid,
      qty: 2,
      unitCost: 10000,
      imeis: ["123456789012345"],
    });
    expect(r.success).toBe(false);
  });

  it("accepts serials when count matches qty", () => {
    const r = receiveStockSchema.safeParse({
      productId: uuid,
      qty: 2,
      unitCost: 50000,
      serials: ["SN-1", "SN-2"],
    });
    expect(r.success).toBe(true);
  });
});

describe("adjustStockSchema", () => {
  it("rejects zero delta", () => {
    const r = adjustStockSchema.safeParse({
      productId: uuid,
      qtyDelta: 0,
      reason: "ADJUSTMENT",
    });
    expect(r.success).toBe(false);
  });

  it("accepts negative adjustment", () => {
    const r = adjustStockSchema.safeParse({
      productId: uuid,
      qtyDelta: -3,
      reason: "DAMAGE",
    });
    expect(r.success).toBe(true);
  });
});
