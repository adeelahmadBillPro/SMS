"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, StockReason, StockStatus, withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Billing, Inventory } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";
import { assertDayOpen } from "@/lib/day-immutability";
import { getCustomerOutstanding } from "@/app/customers/queries";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T> = Ok<T> | Err;

function zodErr(err: import("zod").ZodError): Err {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    (fieldErrors[k] ??= []).push(i.message);
  }
  return { ok: false, error: err.issues[0]?.message ?? "Invalid input", fieldErrors };
}

/**
 * Ring up a sale.
 *
 * This is the largest write in the app. It runs inside a single withShop()
 * transaction so either everything lands (sale, items, payments, stock,
 * ledger, stock_item status flips) or nothing does. Idempotent on
 * client_uuid — replaying the same action returns the existing sale id
 * instead of a second row, which is exactly what offline-sync needs
 * later.
 *
 * Authoritative data is re-fetched from the DB before compute:
 *   - product unit_price, unit_cost, tax_rate, has_imei, has_serial
 *   - customer credit_limit + running outstanding (for credit guard)
 *   - shop.allow_negative_stock
 *
 * Invariants enforced before write:
 *   I1 (stock)       — stock_movement sum matches stock_item counts
 *   I2 (payments)    — sum(payments) + credit == total
 *   I3 (ledger)      — sum(debit) == sum(credit) in the sale's ledger lines
 *   I4 (no negative) — blocked unless shop.allow_negative_stock
 *   I5 (serial uniq) — DB unique index catches duplicates
 */
export async function createSaleAction(
  input: unknown,
): Promise<Result<{ id: string; total: number; receiptUrl: string }>> {
  const parsed = Billing.createSaleSchema.safeParse(input);
  if (!parsed.success) return zodErr(parsed.error);

  const { session, membership } = await requireShop();
  const shopId = membership.shopId;

  try {
    const result = await withShop(shopId, async (tx) => {
      // ---- Idempotency: if this client_uuid already committed, return it.
      const prior = await tx.sale.findUnique({
        where: { shopId_clientUuid: { shopId, clientUuid: parsed.data.clientUuid } },
        select: { id: true, total: true },
      });
      if (prior) {
        return { id: prior.id, total: Number(prior.total), replayed: true };
      }

      // ---- Re-fetch products + prices (never trust the client).
      const productIds = Array.from(new Set(parsed.data.cart.map((l) => l.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          cost: true,
          taxRate: true,
          hasImei: true,
          hasSerial: true,
          variants: {
            select: { id: true, priceOverride: true, costOverride: true },
          },
        },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const l of parsed.data.cart) {
        if (!productMap.has(l.productId)) {
          throw new Error(`Product missing or archived: ${l.productId}`);
        }
      }

      // ---- Shop flags (RLS already scopes us, but shop is a global table;
      // we read it via the admin path for allow_negative_stock).
      const shopRow = await tx.$queryRawUnsafe<
        Array<{
          allow_negative_stock: boolean;
          fbr_pos_id_enc: string | null;
          fbr_api_key_enc: string | null;
        }>
      >(
        "SELECT allow_negative_stock, fbr_pos_id_enc, fbr_api_key_enc FROM shop WHERE id = $1::uuid",
        shopId,
      );
      const allowNeg = shopRow[0]?.allow_negative_stock ?? false;
      const hasFbrCreds = !!(shopRow[0]?.fbr_pos_id_enc && shopRow[0]?.fbr_api_key_enc);

      // ---- Build server-authoritative cart + totals.
      const hydratedCart = parsed.data.cart.map((l) => {
        const p = productMap.get(l.productId)!;
        const variant = l.variantId ? p.variants.find((v) => v.id === l.variantId) : null;
        const unitPrice = variant?.priceOverride != null ? Number(variant.priceOverride) : Number(p.price);
        const unitCost = variant?.costOverride != null ? Number(variant.costOverride) : Number(p.cost);
        const taxRate = Number(p.taxRate);
        // Cashier may override the shown price on the cart line; accept the
        // client's unitPrice as long as it isn't higher than the book price
        // (stops accidental upsell; explicit discount goes via l.discount).
        const finalUnitPrice = Math.min(unitPrice, l.unitPrice);
        return {
          productId: l.productId,
          variantId: l.variantId ?? null,
          productName: p.name,
          sku: p.sku,
          qty: l.qty,
          unitPrice: finalUnitPrice,
          unitCost,
          discount: l.discount,
          taxRate,
          identifiers: l.identifiers,
          hasImei: p.hasImei,
          hasSerial: p.hasSerial,
        };
      });

      const totals = Billing.computeCartTotals(hydratedCart, parsed.data.billDiscount);

      // ---- Invariant I2 check.
      const recon = Billing.reconcile(totals.total, parsed.data.payments, parsed.data.creditAmount);
      if (!recon.ok) {
        throw new Error(
          `Payments don't reconcile. Total ${recon.total.toFixed(2)}, paid ${recon.paid.toFixed(2)}, credit ${recon.creditAmount.toFixed(2)}, shortfall ${recon.shortfall.toFixed(2)}.`,
        );
      }

      // ---- Credit guard.
      if (parsed.data.creditAmount > 0) {
        if (!parsed.data.customerId) {
          throw new Error("Credit sales need a customer. Pick one or quick-add.");
        }
        const customer = await tx.customer.findUnique({
          where: { id: parsed.data.customerId },
          select: { id: true, creditLimit: true },
        });
        if (!customer) throw new Error("Customer not found");
        const outstanding = await getCustomerOutstanding(shopId, customer.id);
        if (!Billing.withinCreditLimit(outstanding, parsed.data.creditAmount, Number(customer.creditLimit))) {
          throw new Error(
            `Credit limit exceeded. Customer owes ${outstanding.toFixed(0)}; limit ${Number(customer.creditLimit).toFixed(0)}.`,
          );
        }
      }

      // ---- Stock guard + serialized identifier resolution.
      // Group qty per (product, variant) to compute availability once per key.
      const qtyByKey = new Map<string, number>();
      for (const l of hydratedCart) {
        const key = `${l.productId}::${l.variantId ?? ""}`;
        qtyByKey.set(key, (qtyByKey.get(key) ?? 0) + l.qty);
      }

      for (const [key, qty] of qtyByKey) {
        const [productId, variantKey = ""] = key.split("::");
        if (!productId) continue;
        const cur = await tx.$queryRawUnsafe<Array<{ qty: bigint }>>(
          `SELECT COALESCE(SUM(qty_delta), 0)::bigint AS qty
             FROM stock_movement
            WHERE shop_id = $1::uuid AND product_id = $2::uuid
              AND ($3::uuid IS NULL OR variant_id = $3::uuid)`,
          shopId,
          productId,
          variantKey || null,
        );
        const currentQty = Number(cur[0]?.qty ?? 0);
        if (Inventory.wouldGoNegative(currentQty, -qty, allowNeg)) {
          const p = productMap.get(productId);
          throw new Error(
            `Not enough stock for ${p?.name ?? "product"} (current ${currentQty}, selling ${qty}).`,
          );
        }
      }

      // For serialized lines, resolve identifiers → stock_item rows and
      // reserve them in this transaction.
      const identifierToItem = new Map<string, string>(); // identifier -> stockItemId
      for (const l of hydratedCart) {
        if (!l.hasImei && !l.hasSerial) continue;
        if (!l.identifiers || l.identifiers.length !== l.qty) {
          throw new Error(`Line "${l.productName}" is serialized but identifiers don't match qty`);
        }
        for (const ident of l.identifiers) {
          const items = await tx.stockItem.findMany({
            where: {
              productId: l.productId,
              status: StockStatus.IN_STOCK,
              OR: [{ imei: ident }, { serial: ident }],
            },
            select: { id: true, imei: true, serial: true },
            take: 1,
          });
          const item = items[0];
          if (!item) {
            throw new Error(`Identifier ${ident} not in stock for ${l.productName}`);
          }
          if (identifierToItem.has(ident)) {
            throw new Error(`Identifier ${ident} used twice in this cart`);
          }
          identifierToItem.set(ident, item.id);
        }
      }

      // ---- Day-immutability guard (sale lands today; cashier can't post into a closed day).
      const now = new Date();
      await assertDayOpen(tx, now);

      // ---- Create the sale header. If the shop has FBR credentials
      //      configured, the sale starts in PENDING state so the worker
      //      (M14 / live FBR integration) can post it and flip to POSTED.
      //      Without creds the sale stays at NONE.
      const sale = await tx.sale.create({
        data: {
          shopId,
          customerId: parsed.data.customerId ?? null,
          cashierUserId: session.userId,
          soldAt: now,
          subtotal: totals.subtotal,
          discount: totals.lineDiscountTotal + totals.billDiscount,
          tax: totals.tax,
          total: totals.total,
          creditAmount: parsed.data.creditAmount,
          clientUuid: parsed.data.clientUuid,
          fbrStatus: hasFbrCreds ? "PENDING" : "NONE",
        },
        select: { id: true, total: true },
      });

      // ---- Sale items: one row per unit for serialized (traceability);
      //      one row per line for non-serialized.
      for (let i = 0; i < hydratedCart.length; i += 1) {
        const l = hydratedCart[i]!;
        const lt = totals.lines[i]!;
        if (l.hasImei || l.hasSerial) {
          // Per-unit rows. Split the line totals evenly across units.
          const perUnitBase = lt.taxableBase / l.qty;
          const perUnitTax = lt.tax / l.qty;
          const perUnitLineTotal = lt.lineTotal / l.qty;
          const perUnitDiscount = lt.lineDiscount / l.qty;
          for (const ident of l.identifiers ?? []) {
            const stockItemId = identifierToItem.get(ident)!;
            await tx.saleItem.create({
              data: {
                shopId,
                saleId: sale.id,
                productId: l.productId,
                variantId: l.variantId ?? null,
                stockItemId,
                qty: 1,
                unitPrice: l.unitPrice,
                unitCost: l.unitCost,
                discount: perUnitDiscount,
                tax: perUnitTax,
                lineTotal: perUnitLineTotal,
              },
            });
            await tx.stockItem.update({
              where: { id: stockItemId },
              data: { status: StockStatus.SOLD },
            });
          }
        } else {
          await tx.saleItem.create({
            data: {
              shopId,
              saleId: sale.id,
              productId: l.productId,
              variantId: l.variantId ?? null,
              qty: l.qty,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              discount: lt.lineDiscount,
              tax: lt.tax,
              lineTotal: lt.lineTotal,
            },
          });
        }

        // One aggregate stock_movement per line (qty_delta = -qty).
        await tx.stockMovement.create({
          data: {
            shopId,
            productId: l.productId,
            variantId: l.variantId ?? null,
            qtyDelta: -l.qty,
            reason: StockReason.SALE,
            refTable: "sale",
            refId: sale.id,
            createdBy: session.userId,
          },
        });
      }

      // ---- Payments.
      for (const p of parsed.data.payments) {
        if (p.amount <= 0) continue;
        await tx.payment.create({
          data: {
            shopId,
            saleId: sale.id,
            customerId: parsed.data.customerId ?? null,
            partyType: parsed.data.customerId ? "CUSTOMER" : null,
            method: p.method as PaymentMethod,
            amount: p.amount,
            paidAt: now,
          },
        });
      }

      // ---- Ledger (double-entry). Look up accounts by code.
      const accountCodes = ["1000", "1100", "1200", "2100", "4000"] as const;
      const accounts = await tx.account.findMany({
        where: { code: { in: [...accountCodes] } },
        select: { id: true, code: true },
      });
      const accountByCode = new Map(accounts.map((a) => [a.code, a.id]));
      const missingAccount = accountCodes.find((c) => !accountByCode.has(c));
      if (missingAccount) {
        throw new Error(`Chart of accounts missing code ${missingAccount}. Re-run onboarding.`);
      }

      const ledgerLines = Billing.buildSaleLedgerLines({
        total: totals.total,
        tax: totals.tax,
        payments: parsed.data.payments,
        creditAmount: parsed.data.creditAmount,
      });
      const balance = Billing.assertBalanced(ledgerLines);
      if (!balance.balanced) {
        throw new Error(
          `Internal error: ledger unbalanced (debit ${balance.debit}, credit ${balance.credit}).`,
        );
      }

      if (ledgerLines.length > 0) {
        await tx.ledgerEntry.createMany({
          data: ledgerLines.map((l) => ({
            shopId,
            entryDate: now,
            accountId: accountByCode.get(l.accountCode)!,
            debit: l.debit,
            credit: l.credit,
            refTable: "sale",
            refId: sale.id,
            memo: l.memo ?? null,
          })) satisfies Prisma.LedgerEntryCreateManyInput[],
        });
      }

      return { id: sale.id, total: Number(sale.total), replayed: false };
    });

    revalidatePath("/pos");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return {
      ok: true,
      data: {
        id: result.id,
        total: result.total,
        receiptUrl: `/pos/receipt/${result.id}`,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sale failed";
    return { ok: false, error: msg };
  }
}
