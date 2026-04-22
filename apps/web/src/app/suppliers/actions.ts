"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Khata } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T> = Ok<T> | Err;
type VoidResult = { ok: true } | Err;

function zErr(e: import("zod").ZodError): Err {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of e.issues) {
    const k = i.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(i.message);
  }
  return { ok: false, error: e.issues[0]?.message ?? "Invalid input", fieldErrors };
}

export async function createSupplierAction(
  input: unknown,
): Promise<Result<{ id: string; name: string }>> {
  const parsed = Khata.createSupplierSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { membership } = await requireShop();
  try {
    const s = await withShop(membership.shopId, async (tx) => {
      return tx.supplier.create({
        data: {
          shopId: membership.shopId,
          name: parsed.data.name,
          phone: parsed.data.phone ?? null,
          address: parsed.data.address ?? null,
          ntn: parsed.data.ntn ?? null,
          openingBalance: parsed.data.openingBalance,
          notes: parsed.data.notes ?? null,
        },
        select: { id: true, name: true },
      });
    });
    revalidatePath("/suppliers");
    return { ok: true, data: s };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Create failed" };
  }
}

export async function recordSupplierPaymentAction(input: unknown): Promise<VoidResult> {
  const parsed = Khata.recordSupplierPaymentSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { session, membership } = await requireShop();
  const shopId = membership.shopId;
  try {
    await withShop(shopId, async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: parsed.data.supplierId } });
      if (!supplier) throw new Error("Supplier not found");

      const paidAt = parsed.data.paidAt ?? new Date();

      await tx.payment.create({
        data: {
          shopId,
          supplierId: supplier.id,
          partyType: "SUPPLIER",
          method: parsed.data.method as PaymentMethod,
          amount: parsed.data.amount,
          paidAt,
          note: parsed.data.note ?? null,
        },
      });

      const ledger = Khata.buildSupplierOnAccountPaymentLedgerLines({
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
            refId: supplier.id,
            memo: l.memo ?? null,
          })) satisfies Prisma.LedgerEntryCreateManyInput[],
        });
      }
      // Suppress unused-import warning: session is currently unused
      // but kept so future audit_log entries can reference it.
      void session;
    });
    revalidatePath(`/suppliers/${parsed.data.supplierId}`);
    revalidatePath("/suppliers");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Payment failed" };
  }
}
