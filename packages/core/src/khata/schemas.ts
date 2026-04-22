import { z } from "zod";

const money = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
    if (!Number.isFinite(n) || n < 0) {
      ctx.addIssue({ code: "custom", message: "Must be non-negative" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const paymentMethod = z.enum([
  "CASH",
  "BANK",
  "JAZZCASH",
  "EASYPAISA",
  "CARD",
  "CHEQUE",
  "CREDIT",
]);

const nonEmpty = z.string().trim().min(1);

export const createSupplierSchema = z.object({
  name: nonEmpty.max(200),
  phone: z.string().trim().max(32).optional().or(z.literal("")).transform((v) => v || undefined),
  address: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
  ntn: z.string().trim().max(32).optional().or(z.literal("")).transform((v) => v || undefined),
  openingBalance: money.default(0),
  notes: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const purchaseLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qty: z.coerce.number().int().min(1).max(10_000),
  unitCost: money,
  taxRate: z.coerce.number().min(0).max(100).default(0),
  identifiers: z.array(z.string().trim().min(1).max(64)).optional(),
});
export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;

export const purchasePaymentSchema = z.object({
  method: paymentMethod,
  amount: money,
});

export const createPurchaseSchema = z
  .object({
    clientUuid: z.string().uuid(),
    supplierId: z.string().uuid(),
    invoiceNo: z.string().trim().max(64).optional().or(z.literal("")).transform((v) => v || undefined),
    purchasedAt: z.coerce.date().optional(),
    lines: z.array(purchaseLineSchema).min(1, "Add at least one item"),
    payments: z.array(purchasePaymentSchema).default([]),
    notes: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
  })
  .refine((v) => v.lines.every((l) => l.qty > 0), {
    message: "Qty must be > 0 for every line",
    path: ["lines"],
  });
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const recordCustomerPaymentSchema = z.object({
  customerId: z.string().uuid(),
  method: paymentMethod.refine((v) => v !== "CREDIT", {
    message: "Credit is not a valid payment method",
  }),
  amount: money.refine((v) => v > 0, { message: "Amount must be > 0" }),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});
export type RecordCustomerPaymentInput = z.infer<typeof recordCustomerPaymentSchema>;

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().uuid(),
  method: paymentMethod.refine((v) => v !== "CREDIT", {
    message: "Credit is not a valid payment method",
  }),
  amount: money.refine((v) => v > 0, { message: "Amount must be > 0" }),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});
export type RecordSupplierPaymentInput = z.infer<typeof recordSupplierPaymentSchema>;
