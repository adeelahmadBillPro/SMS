"use server";

import { revalidatePath } from "next/cache";
import { StockReason, StockStatus, withShop } from "@shopos/db";
import { Inventory } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";

type Ok<T = undefined> = T extends undefined ? { ok: true } : { ok: true; data: T };
type Err = { ok: false; error: string; fieldErrors?: Record<string, string[]> };
type Result<T = undefined> = Ok<T> | Err;

function formatZod(err: import("zod").ZodError): Err {
  const fieldErrors: Record<string, string[]> = {};
  for (const i of err.issues) {
    const path = i.path.join(".") || "_";
    (fieldErrors[path] ??= []).push(i.message);
  }
  const first = err.issues[0]?.message ?? "Invalid input";
  return { ok: false, error: first, fieldErrors };
}

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

export async function createProductAction(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = Inventory.createProductSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);
  const { membership } = await requireShop();

  try {
    const created = await withShop(membership.shopId, async (tx) => {
      return tx.product.create({
        data: {
          shopId: membership.shopId,
          sku: parsed.data.sku,
          name: parsed.data.name,
          category: parsed.data.category,
          brand: parsed.data.brand ?? null,
          model: parsed.data.model ?? null,
          unit: parsed.data.unit,
          cost: parsed.data.cost,
          price: parsed.data.price,
          taxRate: parsed.data.taxRate,
          barcode: parsed.data.barcode ?? null,
          hasImei: parsed.data.hasImei,
          hasSerial: parsed.data.hasSerial,
          hasWarranty: parsed.data.hasWarranty,
          lowStockThreshold: parsed.data.lowStockThreshold,
          reorderQty: parsed.data.reorderQty,
          leadTimeDays: parsed.data.leadTimeDays,
        },
        select: { id: true },
      });
    });
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { ok: true, data: created };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed";
    if (/unique constraint/i.test(msg) && /sku/i.test(msg)) {
      return { ok: false, error: "SKU already exists in this shop" };
    }
    return { ok: false, error: msg };
  }
}

export async function updateProductAction(
  productId: string,
  input: unknown,
): Promise<Result> {
  const parsed = Inventory.updateProductSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);
  const { membership } = await requireShop();

  try {
    await withShop(membership.shopId, async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: parsed.data,
      });
    });
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${productId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function archiveProductAction(productId: string): Promise<Result> {
  const { membership } = await requireShop();
  await withShop(membership.shopId, async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${productId}`);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Variants
// ----------------------------------------------------------------------------

export async function createVariantAction(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = Inventory.createVariantSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);
  const { membership } = await requireShop();

  try {
    const v = await withShop(membership.shopId, async (tx) => {
      return tx.productVariant.create({
        data: {
          shopId: membership.shopId,
          productId: parsed.data.productId,
          color: parsed.data.color ?? null,
          storage: parsed.data.storage ?? null,
          ram: parsed.data.ram ?? null,
          costOverride: parsed.data.costOverride ?? null,
          priceOverride: parsed.data.priceOverride ?? null,
        },
        select: { id: true },
      });
    });
    revalidatePath(`/inventory/${parsed.data.productId}`);
    return { ok: true, data: v };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Create variant failed" };
  }
}

// ----------------------------------------------------------------------------
// Stock movements: receive + adjust
// ----------------------------------------------------------------------------

export async function receiveStockAction(input: unknown): Promise<Result> {
  const parsed = Inventory.receiveStockSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);
  const { membership, session } = await requireShop();
  const shopId = membership.shopId;

  try {
    await withShop(shopId, async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: parsed.data.productId },
        select: { id: true, hasImei: true, hasSerial: true },
      });
      if (!product) throw new Error("Product not found");

      // Serialized products require matching identifiers for receive.
      if (product.hasImei && (!parsed.data.imeis || parsed.data.imeis.length !== parsed.data.qty)) {
        throw new Error("IMEI required for every unit of this serialized product");
      }
      if (product.hasSerial && (!parsed.data.serials || parsed.data.serials.length !== parsed.data.qty)) {
        throw new Error("Serial required for every unit of this serialized product");
      }

      // Create stock_item rows for each serialized unit.
      if (product.hasImei || product.hasSerial) {
        const rows: Array<{ imei?: string; serial?: string }> = [];
        for (let i = 0; i < parsed.data.qty; i += 1) {
          rows.push({
            imei: parsed.data.imeis?.[i],
            serial: parsed.data.serials?.[i],
          });
        }
        await tx.stockItem.createMany({
          data: rows.map((r) => ({
            shopId,
            productId: product.id,
            variantId: parsed.data.variantId ?? null,
            imei: r.imei ?? null,
            serial: r.serial ?? null,
            status: StockStatus.IN_STOCK,
          })),
        });
      }

      // Single aggregate movement — qty_delta = qty.
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: product.id,
          variantId: parsed.data.variantId ?? null,
          qtyDelta: parsed.data.qty,
          reason: parsed.data.reason === "OPENING" ? StockReason.OPENING : StockReason.PURCHASE,
          createdBy: session.userId,
        },
      });
    });
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsed.data.productId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Receive failed";
    if (/unique constraint/i.test(msg) && /imei/i.test(msg)) {
      return { ok: false, error: "One of the IMEIs is already in stock" };
    }
    if (/unique constraint/i.test(msg) && /serial/i.test(msg)) {
      return { ok: false, error: "One of the serials is already in stock" };
    }
    return { ok: false, error: msg };
  }
}

export async function adjustStockAction(input: unknown): Promise<Result> {
  const parsed = Inventory.adjustStockSchema.safeParse(input);
  if (!parsed.success) return formatZod(parsed.error);
  const { membership, session } = await requireShop();
  const shopId = membership.shopId;

  try {
    await withShop(shopId, async (tx) => {
      const shopRow = await tx.$queryRawUnsafe<Array<{ allow_negative_stock: boolean }>>(
        "SELECT allow_negative_stock FROM shop WHERE id = $1",
        shopId,
      );
      const allowNeg = shopRow[0]?.allow_negative_stock ?? false;

      if (parsed.data.qtyDelta < 0) {
        const cur = await tx.$queryRawUnsafe<Array<{ qty: bigint }>>(
          `SELECT COALESCE(SUM(qty_delta), 0)::bigint AS qty
             FROM stock_movement
            WHERE shop_id = $1 AND product_id = $2
              AND ($3::uuid IS NULL OR variant_id = $3::uuid)`,
          shopId,
          parsed.data.productId,
          parsed.data.variantId ?? null,
        );
        const currentQty = Number(cur[0]?.qty ?? 0);
        if (Inventory.wouldGoNegative(currentQty, parsed.data.qtyDelta, allowNeg)) {
          throw new Error(
            `Adjustment would drop stock below zero (current ${currentQty}, delta ${parsed.data.qtyDelta}).`,
          );
        }
      }

      await tx.stockMovement.create({
        data: {
          shopId,
          productId: parsed.data.productId,
          variantId: parsed.data.variantId ?? null,
          qtyDelta: parsed.data.qtyDelta,
          reason: parsed.data.reason === "DAMAGE" ? StockReason.DAMAGE : StockReason.ADJUSTMENT,
          createdBy: session.userId,
        },
      });

      // For serialized products, if the delta is negative we also flip one
      // IN_STOCK item to DAMAGED. Callers that need to specify *which* IMEI
      // will get a richer Server Action later — for now, the oldest.
      if (parsed.data.qtyDelta < 0 && parsed.data.reason === "DAMAGE") {
        const victims = await tx.stockItem.findMany({
          where: {
            productId: parsed.data.productId,
            variantId: parsed.data.variantId ?? null,
            status: StockStatus.IN_STOCK,
          },
          orderBy: { acquiredAt: "asc" },
          take: Math.abs(parsed.data.qtyDelta),
          select: { id: true },
        });
        if (victims.length > 0) {
          await tx.stockItem.updateMany({
            where: { id: { in: victims.map((v) => v.id) } },
            data: { status: StockStatus.DAMAGED },
          });
        }
      }
    });
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsed.data.productId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Adjustment failed" };
  }
}
