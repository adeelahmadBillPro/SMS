"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Billing, Khata } from "@shopos/core";
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
  return {
    ok: false,
    error: err.issues[0]?.message ?? "Invalid input",
    fieldErrors,
  };
}

export async function quickAddCustomerAction(input: unknown): Promise<Result<{ id: string; name: string }>> {
  const parsed = Billing.quickAddCustomerSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { membership } = await requireShop();
  try {
    const c = await withShop(membership.shopId, async (tx) => {
      return tx.customer.create({
        data: {
          shopId: membership.shopId,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          cnic: parsed.data.cnic ?? null,
          creditLimit: parsed.data.creditLimit,
        },
        select: { id: true, name: true },
      });
    });
    revalidatePath("/customers");
    return { ok: true, data: c };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Create failed" };
  }
}

export async function recordCustomerPaymentAction(input: unknown): Promise<Result> {
  const parsed = Khata.recordCustomerPaymentSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { membership } = await requireShop();
  const shopId = membership.shopId;
  try {
    await withShop(shopId, async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: parsed.data.customerId } });
      if (!customer) throw new Error("Customer not found");
      const paidAt = parsed.data.paidAt ?? new Date();
      await assertDayOpen(tx, paidAt);

      await tx.payment.create({
        data: {
          shopId,
          customerId: customer.id,
          partyType: "CUSTOMER",
          method: parsed.data.method as PaymentMethod,
          amount: parsed.data.amount,
          paidAt,
          note: parsed.data.note ?? null,
        },
      });

      const ledger = Khata.buildCustomerOnAccountPaymentLedgerLines({
        method: parsed.data.method,
        amount: parsed.data.amount,
      });
      if (ledger.length > 0) {
        const codes = Array.from(new Set(ledger.map((l) => l.accountCode)));
        const accts = await tx.account.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        });
        const byCode = new Map(accts.map((a) => [a.code, a.id]));
        await tx.ledgerEntry.createMany({
          data: ledger.map((l) => ({
            shopId,
            entryDate: paidAt,
            accountId: byCode.get(l.accountCode)!,
            debit: l.debit,
            credit: l.credit,
            refTable: "payment",
            refId: customer.id,
            memo: l.memo ?? null,
          })) satisfies Prisma.LedgerEntryCreateManyInput[],
        });
      }
    });
    revalidatePath(`/customers/${parsed.data.customerId}`);
    revalidatePath("/customers");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment failed" };
  }
}
