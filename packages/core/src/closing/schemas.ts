import { z } from "zod";

const money = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Must be a number" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const nonNegMoney = money.refine((v) => v >= 0, { message: "Must be non-negative" });

export const createExpenseSchema = z.object({
  category: z.string().trim().min(1, "Category required").max(100),
  amount: nonNegMoney.refine((v) => v > 0, { message: "Amount must be > 0" }),
  paidAt: z.coerce.date().optional(),
  paidViaCash: z.coerce.boolean().default(true),
  note: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => v || undefined),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const closeDaySchema = z.object({
  closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  actualCash: nonNegMoney,
  notes: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => v || undefined),
});
export type CloseDayInput = z.infer<typeof closeDaySchema>;

/** Standard categories suggested to the shopkeeper. Free-text allowed too. */
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Transport",
  "Repairs",
  "Packaging",
  "Stationery",
  "Marketing",
  "Tea / Food",
  "Other",
] as const;
