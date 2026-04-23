import "server-only";
import { withShop } from "@shopos/db";

export interface ForecastRow {
  productId: string;
  sku: string;
  name: string;
  brand: string | null;
  category: string;
  currentStock: number;
  avgDailySales7d: number;
  avgDailySales30d: number;
  daysOfStockRemaining: number;
  reorderPoint: number;
  reorderSuggested: boolean;
  /** Heuristic — 30 days of 7d-trend minus what we have. */
  suggestedReorderQty: number;
  snapshotDate: Date;
  leadTimeDays: number;
  isDeadStock: boolean;
}

/**
 * Latest ForecastSnapshot per product (pick max(snapshotDate)) joined with
 * product attributes. Callers can filter to reorder-suggested on top.
 */
export async function listLatestForecasts(
  shopId: string,
  opts: { onlyReorder?: boolean; onlyDeadStock?: boolean; limit?: number } = {},
): Promise<ForecastRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        product_id: string;
        sku: string;
        name: string;
        brand: string | null;
        category: string;
        current_stock: number;
        avg_7d: string;
        avg_30d: string;
        days_remaining: string;
        reorder_point: number;
        reorder_suggested: boolean;
        snapshot_date: Date;
        lead_time_days: number;
        qty_60d: bigint;
      }>
    >(
      `WITH latest AS (
         SELECT DISTINCT ON (product_id) *
           FROM forecast_snapshot
          ORDER BY product_id, snapshot_date DESC
       ),
       sold_60 AS (
         SELECT si.product_id, COALESCE(SUM(si.qty), 0)::bigint AS qty
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
          WHERE s.sold_at >= NOW() - INTERVAL '60 days'
          GROUP BY si.product_id
       )
       SELECT l.product_id, p.sku, p.name, p.brand, p.category::text AS category,
              l.current_stock, l.avg_daily_sales_7d AS avg_7d,
              l.avg_daily_sales_30d AS avg_30d,
              l.days_of_stock_remaining AS days_remaining,
              l.reorder_point, l.reorder_suggested, l.snapshot_date,
              p.lead_time_days,
              COALESCE(s60.qty, 0)::bigint AS qty_60d
         FROM latest l
         JOIN product p ON p.id = l.product_id
         LEFT JOIN sold_60 s60 ON s60.product_id = l.product_id
        WHERE p.is_active = true
        ORDER BY l.days_of_stock_remaining ASC
        LIMIT ${limit}`,
    );

    const mapped: ForecastRow[] = rows.map((r) => {
      const avg7 = Number(r.avg_7d);
      const stock = Number(r.current_stock);
      const target30 = Math.ceil(avg7 * 30);
      const suggestedReorderQty = Math.max(0, target30 - stock);
      return {
        productId: r.product_id,
        sku: r.sku,
        name: r.name,
        brand: r.brand,
        category: r.category,
        currentStock: stock,
        avgDailySales7d: avg7,
        avgDailySales30d: Number(r.avg_30d),
        daysOfStockRemaining: Number(r.days_remaining),
        reorderPoint: r.reorder_point,
        reorderSuggested: r.reorder_suggested,
        suggestedReorderQty,
        snapshotDate: r.snapshot_date,
        leadTimeDays: r.lead_time_days,
        isDeadStock: Number(r.qty_60d) === 0 && stock > 0,
      };
    });

    if (opts.onlyReorder) return mapped.filter((r) => r.reorderSuggested);
    if (opts.onlyDeadStock) return mapped.filter((r) => r.isDeadStock);
    return mapped;
  });
}

/** Top N reorder suggestions, sorted by most-critical. Dashboard card uses this. */
export async function listTopReorderSuggestions(
  shopId: string,
  limit = 6,
): Promise<ForecastRow[]> {
  const all = await listLatestForecasts(shopId, { onlyReorder: true, limit: limit * 3 });
  return all.slice(0, limit);
}

export async function countReorderSuggestions(shopId: string): Promise<number> {
  const all = await listLatestForecasts(shopId, { onlyReorder: true, limit: 1000 });
  return all.length;
}

/** Has the forecasting job ever run for this shop? */
export async function forecastExists(shopId: string): Promise<boolean> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*)::bigint AS n FROM forecast_snapshot LIMIT 1`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  });
}
