"use server";

import { revalidatePath } from "next/cache";
import { withShop } from "@shopos/db";
import { Billing } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; data: T })
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function quickAddCustomerAction(input: unknown): Promise<Result<{ id: string; name: string }>> {
  const parsed = Billing.quickAddCustomerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const i of parsed.error.issues) {
      const k = i.path.join(".") || "_";
      (fieldErrors[k] ??= []).push(i.message);
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors,
    };
  }
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
