import { NextResponse, type NextRequest } from "next/server";
import { prismaAdmin, withShop } from "@shopos/db";
import type { Prisma } from "@shopos/db";
import { Closing, Forecasting } from "@shopos/core";

export const dynamic = "force-dynamic";

/**
 * Nightly forecasting recompute — called by any cron scheduler (VPS cron,
 * Vercel cron, BullMQ worker in Phase 2). Secured by CRON_SECRET in the
 * Authorization header to avoid bot abuse.
 *
 * Iterates every active shop and writes one ForecastSnapshot per product
 * dated to today's PKT calendar date, replacing any earlier run for today.
 *
 * Returns a JSON summary so the cron runner can log success.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = Closing.pktDateString(new Date());
  const snapshotDate = new Date(`${today}T00:00:00.000Z`);
  const shops = await prismaAdmin.shop.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
  });

  let totalProducts = 0;
  let totalSuggestions = 0;
  const errors: Array<{ shopId: string; error: string }> = [];

  for (const shop of shops) {
    try {
      const { products, suggestions } = await recomputeForShop(shop.id, snapshotDate);
      totalProducts += products;
      totalSuggestions += suggestions;
    } catch (err) {
      errors.push({ shopId: shop.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    ok: true,
    day: today,
    shops: shops.length,
    products: totalProducts,
    suggestions: totalSuggestions,
    errors,
  });
}

async function recomputeForShop(
  shopId: string,
  snapshotDate: Date,
): Promise<{ products: number; suggestions: number }> {
  return withShop(shopId, async (tx) => {
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
              COALESCE((SELECT SUM(si.qty) FROM sale_item si
                         JOIN sale s ON s.id = si.sale_id
                        WHERE si.product_id = p.id AND s.sold_at >= NOW() - INTERVAL '7 days'), 0)::bigint AS qty_7d,
              COALESCE((SELECT SUM(si.qty) FROM sale_item si
                         JOIN sale s ON s.id = si.sale_id
                        WHERE si.product_id = p.id AND s.sold_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS qty_30d,
              COALESCE((SELECT SUM(si.qty) FROM sale_item si
                         JOIN sale s ON s.id = si.sale_id
                        WHERE si.product_id = p.id AND s.sold_at >= NOW() - INTERVAL '60 days'), 0)::bigint AS qty_60d,
              COALESCE((SELECT SUM(qty_delta) FROM stock_movement sm
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

    if (toCreate.length > 0) {
      await tx.forecastSnapshot.deleteMany({ where: { snapshotDate } });
      await tx.forecastSnapshot.createMany({ data: toCreate });
    }

    return { products: rows.length, suggestions };
  });
}
