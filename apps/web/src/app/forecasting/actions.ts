"use server";

import { revalidatePath } from "next/cache";
import { withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Closing, Forecasting } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";

type Result = { ok: true; data: { products: number; suggestions: number } } | { ok: false; error: string };

/**
 * Recompute ForecastSnapshot for every active product in this shop. Writes
 * one row per (product, today) upserting over any existing snapshot for
 * today. The worker runs this nightly; this Server Action lets owners
 * trigger a manual recompute (after a big stock-in, before a reorder run).
 */
export async function recomputeForecastsAction(): Promise<Result> {
  const { membership } = await requireShop();
  const shopId = membership.shopId;
  const today = Closing.pktDateString(new Date());
  const snapshotDate = new Date(`${today}T00:00:00.000Z`);

  try {
    const result = await withShop(shopId, async (tx) => {
      // Pull aggregate stats per active product in one round trip.
      const rows = await tx.$queryRawUnsafe<
        Array<{
          product_id: string;
          qty_7d: bigint;
          qty_30d: bigint;
          qty_60d: bigint;
          current_stock: bigint;
          lead_time_days: number;
        }>
      >(
        `SELECT p.id AS product_id,
                COALESCE((SELECT SUM(si.qty)
                            FROM sale_item si
                            JOIN sale s ON s.id = si.sale_id
                           WHERE si.product_id = p.id
                             AND s.sold_at >= NOW() - INTERVAL '7 days'), 0)::bigint AS qty_7d,
                COALESCE((SELECT SUM(si.qty)
                            FROM sale_item si
                            JOIN sale s ON s.id = si.sale_id
                           WHERE si.product_id = p.id
                             AND s.sold_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS qty_30d,
                COALESCE((SELECT SUM(si.qty)
                            FROM sale_item si
                            JOIN sale s ON s.id = si.sale_id
                           WHERE si.product_id = p.id
                             AND s.sold_at >= NOW() - INTERVAL '60 days'), 0)::bigint AS qty_60d,
                COALESCE((SELECT SUM(qty_delta)
                            FROM stock_movement sm
                           WHERE sm.product_id = p.id), 0)::bigint AS current_stock,
                p.lead_time_days
           FROM product p
          WHERE p.is_active = true`,
      );

      let suggestions = 0;
      const toCreate: Prisma.ForecastSnapshotCreateManyInput[] = [];
      for (const r of rows) {
        const f = Forecasting.computeForecast({
          qtySoldLast7d: Number(r.qty_7d),
          qtySoldLast30d: Number(r.qty_30d),
          qtySoldLast60d: Number(r.qty_60d),
          currentStock: Number(r.current_stock),
          leadTimeDays: r.lead_time_days,
        });
        if (f.reorderSuggested) suggestions += 1;
        toCreate.push({
          shopId,
          productId: r.product_id,
          snapshotDate,
          avgDailySales7d: f.avgDailySales7d,
          avgDailySales30d: f.avgDailySales30d,
          currentStock: f.currentStock,
          daysOfStockRemaining: f.daysOfStockRemaining,
          reorderPoint: f.reorderPoint,
          reorderSuggested: f.reorderSuggested,
        });
      }

      // Replace any existing snapshot for today so a manual recompute
      // overwrites the nightly one.
      if (toCreate.length > 0) {
        await tx.forecastSnapshot.deleteMany({
          where: { snapshotDate },
        });
        await tx.forecastSnapshot.createMany({ data: toCreate });
      }

      return { products: rows.length, suggestions };
    });

    revalidatePath("/dashboard");
    revalidatePath("/inventory/forecast");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Recompute failed" };
  }
}
