"use server";

import { revalidatePath } from "next/cache";
import { withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Closing } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";
import { assertDayOpen } from "@/lib/day-immutability";

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function zErr(err: import("zod").ZodError): { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(i.message);
  }
  return { ok: false, error: err.issues[0]?.message ?? "Invalid input", fieldErrors };
}

/**
 * Record an expense (rent, transport, utility, misc). Writes the expense
 * row + a balanced ledger entry:
 *   DEBIT  Expenses (6000)
 *   CREDIT Cash (1000) or Bank (1100)
 */
export async function createExpenseAction(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = Closing.createExpenseSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { membership } = await requireShop();
  const shopId = membership.shopId;
  try {
    const created = await withShop(shopId, async (tx) => {
      const paidAt = parsed.data.paidAt ?? new Date();
      await assertDayOpen(tx, paidAt);

      // Locate the Expenses + Cash/Bank accounts.
      const code = parsed.data.paidViaCash ? "1000" : "1100";
      const accts = await tx.account.findMany({
        where: { code: { in: ["6000", code] } },
        select: { id: true, code: true },
      });
      const byCode = new Map(accts.map((a) => [a.code, a.id]));
      const expensesAcct = byCode.get("6000");
      const assetAcct = byCode.get(code);
      if (!expensesAcct || !assetAcct) {
        throw new Error(`Chart of accounts missing 6000 or ${code}. Re-run onboarding.`);
      }

      const expense = await tx.expense.create({
        data: {
          shopId,
          category: parsed.data.category,
          amount: parsed.data.amount,
          paidAt,
          accountId: expensesAcct,
          paidViaCash: parsed.data.paidViaCash,
          note: parsed.data.note ?? null,
        },
        select: { id: true },
      });

      await tx.ledgerEntry.createMany({
        data: [
          {
            shopId,
            entryDate: paidAt,
            accountId: expensesAcct,
            debit: parsed.data.amount,
            credit: 0,
            refTable: "expense",
            refId: expense.id,
            memo: parsed.data.category,
          },
          {
            shopId,
            entryDate: paidAt,
            accountId: assetAcct,
            debit: 0,
            credit: parsed.data.amount,
            refTable: "expense",
            refId: expense.id,
            memo: parsed.data.category,
          },
        ] satisfies Prisma.LedgerEntryCreateManyInput[],
      });

      return expense;
    });
    revalidatePath("/expenses");
    revalidatePath("/closing");
    revalidatePath("/dashboard");
    return { ok: true, data: created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Create failed" };
  }
}
