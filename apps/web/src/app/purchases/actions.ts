"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, StockReason, StockStatus, withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Khata } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";
import { assertDayOpen } from "@/lib/day-immutability";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T> = Ok<T> | Err;

function zErr(e: import("zod").ZodError): Err {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of e.issues) {
    const k = i.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(i.message);
  }
  return { ok: false, error: e.issues[0]?.message ?? "Invalid input", fieldErrors };
}

/**
 * Record a purchase. One transaction that writes:
 *   - purchase header + purchase_item rows
 *   - stock_movement (+qty) per line
 *   - stock_item rows for serialized lines (IMEI / serial)
 *   - payment rows for any immediate cash/bank tender
 *   - ledger_entry rows (balanced double-entry)
 *
 * Remaining balance after payments becomes the supplier's payable.
 * Idempotent on client_uuid — re-submitting returns the prior id.
 */
export async function createPurchaseAction(
  input: unknown,
): Promise<Result<{ id: string; total: number }>> {
  const parsed = Khata.createPurchaseSchema.safeParse(input);
  if (!parsed.success) return zErr(parsed.error);
  const { session, membership } = await requireShop();
  const shopId = membership.shopId;

  try {
    const result = await withShop(shopId, async (tx) => {
      // Idempotency.
      const prior = await tx.purchase.findUnique({
        where: { shopId_clientUuid: { shopId, clientUuid: parsed.data.clientUuid } },
        select: { id: true, total: true },
      });
      if (prior) return { id: prior.id, total: Number(prior.total) };

      // Re-fetch authoritative product data.
      const productIds = Array.from(new Set(parsed.data.lines.map((l) => l.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true, name: true, hasImei: true, hasSerial: true, taxRate: true,
          variants: { select: { id: true } },
        },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const l of parsed.data.lines) {
        if (!productMap.has(l.productId)) throw new Error(`Product missing: ${l.productId}`);
      }

      // Validate supplier exists.
      const supplier = await tx.supplier.findUnique({ where: { id: parsed.data.supplierId } });
      if (!supplier) throw new Error("Supplier not found");

      // Hydrate lines with server-side product attributes + totals.
      const hydrated = parsed.data.lines.map((l) => {
        const p = productMap.get(l.productId)!;
        const taxRate = l.taxRate ?? Number(p.taxRate);
        return {
          ...l,
          productName: p.name,
          hasImei: p.hasImei,
          hasSerial: p.hasSerial,
          taxRate,
        };
      });

      const totals = Khata.computePurchaseTotals(
        hydrated.map((h) => ({
          productId: h.productId,
          variantId: h.variantId ?? null,
          productName: h.productName,
          sku: "",
          qty: h.qty,
          unitCost: h.unitCost,
          taxRate: h.taxRate,
        })),
      );

      // Serialized identifier validation.
      for (const h of hydrated) {
        if ((h.hasImei || h.hasSerial) && (!h.identifiers || h.identifiers.length !== h.qty)) {
          throw new Error(
            `${h.productName} is a ${h.hasImei ? "IMEI" : "serial"}-tracked product — provide ${h.qty} ${h.hasImei ? "IMEIs" : "serials"}.`,
          );
        }
      }

      // Compute paid at receive vs supplier credit.
      const paidAtReceive = parsed.data.payments
        .filter((p) => p.method !== "CREDIT")
        .reduce((a, p) => a + Math.max(0, p.amount), 0);
      const creditToSupplier = Math.max(0, Math.round((totals.total - paidAtReceive) * 100) / 100);

      const purchasedAt = parsed.data.purchasedAt ?? new Date();
      await assertDayOpen(tx, purchasedAt);

      // ---- Create purchase header + items.
      const purchase = await tx.purchase.create({
        data: {
          shopId,
          supplierId: supplier.id,
          invoiceNo: parsed.data.invoiceNo ?? null,
          purchasedAt,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          notes: parsed.data.notes ?? null,
          clientUuid: parsed.data.clientUuid,
        },
        select: { id: true, total: true },
      });

      for (let i = 0; i < hydrated.length; i += 1) {
        const h = hydrated[i]!;
        const lt = totals.lines[i]!;
        await tx.purchaseItem.create({
          data: {
            shopId,
            purchaseId: purchase.id,
            productId: h.productId,
            variantId: h.variantId ?? null,
            qty: h.qty,
            unitCost: h.unitCost,
            lineTotal: lt.lineTotal,
          },
        });

        // Aggregate stock_movement (+qty).
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: h.productId,
            variantId: h.variantId ?? null,
            qtyDelta: h.qty,
            reason: StockReason.PURCHASE,
            refTable: "purchase",
            refId: purchase.id,
            createdBy: session.userId,
          },
        });

        // Per-unit stock_item rows for serialized products.
        if ((h.hasImei || h.hasSerial) && h.identifiers) {
          await tx.stockItem.createMany({
            data: h.identifiers.map((ident) => ({
              shopId,
              productId: h.productId,
              variantId: h.variantId ?? null,
              imei: h.hasImei ? ident : null,
              serial: h.hasSerial ? ident : null,
              status: StockStatus.IN_STOCK,
            })),
          });
        }
      }

      // ---- Payments at receive.
      for (const p of parsed.data.payments) {
        if (p.method === "CREDIT" || p.amount <= 0) continue;
        await tx.payment.create({
          data: {
            shopId,
            purchaseId: purchase.id,
            supplierId: supplier.id,
            partyType: "SUPPLIER",
            method: p.method as PaymentMethod,
            amount: p.amount,
            paidAt: purchasedAt,
          },
        });
      }

      // ---- Ledger.
      const ledger = Khata.buildPurchaseLedgerLines({
        total: totals.total,
        payments: parsed.data.payments,
        creditToSupplier,
      });
      if (ledger.length > 0) {
        const codes = Array.from(new Set(ledger.map((l) => l.accountCode)));
        const accts = await tx.account.findMany({
          where: { code: { in: codes } },
          select: { id: true, code: true },
        });
        const byCode = new Map(accts.map((a) => [a.code, a.id]));
        for (const c of codes) if (!byCode.has(c)) throw new Error(`Chart of accounts missing code ${c}`);
        await tx.ledgerEntry.createMany({
          data: ledger.map((l) => ({
            shopId,
            entryDate: purchasedAt,
            accountId: byCode.get(l.accountCode)!,
            debit: l.debit,
            credit: l.credit,
            refTable: "purchase",
            refId: purchase.id,
            memo: l.memo ?? null,
          })) satisfies Prisma.LedgerEntryCreateManyInput[],
        });
      }

      return { id: purchase.id, total: Number(purchase.total) };
    });

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${result.id}`);
    revalidatePath(`/suppliers/${parsed.data.supplierId}`);
    revalidatePath("/suppliers");
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Purchase failed";
    if (/unique constraint/i.test(msg) && /imei/i.test(msg)) {
      return { ok: false, error: "One of the IMEIs is already in stock" };
    }
    if (/unique constraint/i.test(msg) && /serial/i.test(msg)) {
      return { ok: false, error: "One of the serials is already in stock" };
    }
    return { ok: false, error: msg };
  }
}
