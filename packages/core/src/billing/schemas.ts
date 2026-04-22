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

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  qty: z.coerce.number().int().min(1).max(10_000),
  unitPrice: money,
  discount: money.default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  identifiers: z.array(z.string().trim().min(1).max(64)).optional(),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const paymentSchema = z.object({
  method: paymentMethod,
  amount: money,
});
export type PaymentInputZ = z.infer<typeof paymentSchema>;

export const createSaleSchema = z
  .object({
    clientUuid: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    cart: z.array(cartLineSchema).min(1, "Cart is empty"),
    billDiscount: money.default(0),
    payments: z.array(paymentSchema).default([]),
    creditAmount: money.default(0),
    note: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.payments.length > 0 || v.creditAmount > 0, {
    message: "Add a payment or credit the customer",
    path: ["payments"],
  });
export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const quickAddCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(200),
  phone: z.string().trim().max(32).optional().or(z.literal("")).transform((v) => v || undefined),
  cnic: z.string().trim().max(32).optional().or(z.literal("")).transform((v) => v || undefined),
  creditLimit: money.default(0),
});
export type QuickAddCustomerInput = z.infer<typeof quickAddCustomerSchema>;
