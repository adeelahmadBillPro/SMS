import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const money = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Must be a non-negative number" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const qty = z.coerce.number().int().finite();
const nonNegInt = z.coerce.number().int().min(0);

export const productCategorySchema = z.enum([
  "MOBILE",
  "LAPTOP",
  "ACCESSORY",
  "CHARGER",
  "COVER",
  "SIM",
  "OTHER",
]);

/**
 * Shared base object used by both create and update. Kept as a plain
 * ZodObject (no refine) so `.partial()` + `.extend()` work for the update
 * schema. The "mobiles/laptops need IMEI or serial" rule is applied as a
 * refinement only on create — updates can legitimately clear one flag and
 * set the other in two steps.
 */
const productFieldsSchema = z.object({
  sku: nonEmpty.max(64),
  name: nonEmpty.max(200),
  category: productCategorySchema,
  brand: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
  model: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
  unit: z.string().trim().max(16).default("pcs"),
  cost: money.default(0),
  price: money.default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  barcode: z.string().trim().max(64).optional().or(z.literal("")).transform((v) => v || undefined),
  hasImei: z.coerce.boolean().default(false),
  hasSerial: z.coerce.boolean().default(false),
  hasWarranty: z.coerce.boolean().default(false),
  lowStockThreshold: nonNegInt.default(0),
  reorderQty: nonNegInt.default(0),
  leadTimeDays: nonNegInt.default(7),
});

/** Schema for creating a product. Runs on both server and client. */
export const createProductSchema = productFieldsSchema.refine(
  (v) => !(v.category === "MOBILE" || v.category === "LAPTOP") || v.hasImei || v.hasSerial,
  {
    message: "Mobiles and laptops must track IMEI or serial",
    path: ["hasImei"],
  },
);
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = productFieldsSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createVariantSchema = z
  .object({
    productId: z.string().uuid(),
    color: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
    storage: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || undefined),
    ram: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || undefined),
    costOverride: money.optional(),
    priceOverride: money.optional(),
  })
  .refine((v) => v.color || v.storage || v.ram, {
    message: "Variant must specify at least one of color, storage, or RAM",
    path: ["color"],
  });
export type CreateVariantInput = z.infer<typeof createVariantSchema>;

/**
 * Receive stock (PURCHASE or OPENING). For serialized products, `imeis` or
 * `serials` carry the per-unit identifiers and must have length == qty.
 */
export const receiveStockSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    qty: qty.min(1, "Qty must be at least 1"),
    unitCost: money,
    reason: z.enum(["PURCHASE", "OPENING"]).default("PURCHASE"),
    imeis: z.array(z.string().trim().min(3).max(32)).optional(),
    serials: z.array(z.string().trim().min(1).max(64)).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine(
    (v) => !v.imeis || v.imeis.length === v.qty,
    { message: "IMEI count must match qty", path: ["imeis"] },
  )
  .refine(
    (v) => !v.serials || v.serials.length === v.qty,
    { message: "Serial count must match qty", path: ["serials"] },
  );
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qtyDelta: qty.refine((v) => v !== 0, { message: "qtyDelta cannot be zero" }),
  reason: z.enum(["DAMAGE", "ADJUSTMENT"]),
  note: z.string().trim().max(500).optional(),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
