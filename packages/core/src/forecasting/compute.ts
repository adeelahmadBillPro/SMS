/**
 * Phase 1 forecasting — SPEC §9. Pure arithmetic so it's unit-testable
 * without a DB. The worker job queries the rolling sales counts + current
 * stock per product and feeds them in here.
 *
 * Formula (SPEC §9):
 *   avg_daily_sales_7d   = qty_sold_last_7d  / 7
 *   avg_daily_sales_30d  = qty_sold_last_30d / 30
 *   days_of_stock_left   = current_stock / max(avg_daily_sales_7d, 0.01)
 *   safety_stock         = ceil(avg_daily_sales_7d * 2)     // 2-day buffer
 *   reorder_point        = ceil(avg_daily_sales_7d * lead_time_days) + safety_stock
 *   reorder_suggested    = current_stock <= reorder_point
 *
 * Dead stock: no sales in 60d AND current_stock > 0.
 */

export interface ForecastInput {
  qtySoldLast7d: number;
  qtySoldLast30d: number;
  qtySoldLast60d: number;
  currentStock: number;
  leadTimeDays: number;
}

export interface ForecastOutput {
  avgDailySales7d: number;
  avgDailySales30d: number;
  currentStock: number;
  daysOfStockRemaining: number;
  safetyStock: number;
  reorderPoint: number;
  reorderSuggested: boolean;
  isDeadStock: boolean;
  /** A small helper: how many units to actually order, based on a "cover the
   *  next 30 days" heuristic net of current stock. Callers can override via
   *  product.reorder_qty. */
  suggestedReorderQty: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function computeForecast(input: ForecastInput): ForecastOutput {
  const avg7 = round2(Math.max(0, input.qtySoldLast7d) / 7);
  const avg30 = round2(Math.max(0, input.qtySoldLast30d) / 30);
  const safe = Math.max(0, input.currentStock);
  const daysLeft = round2(safe / Math.max(avg7, 0.01));
  const safetyStock = Math.ceil(Math.max(0, avg7) * 2);
  const reorderPoint = Math.ceil(Math.max(0, avg7) * Math.max(0, input.leadTimeDays)) + safetyStock;
  const reorderSuggested = safe <= reorderPoint && (avg7 > 0 || avg30 > 0);
  const isDeadStock = input.qtySoldLast60d <= 0 && safe > 0;

  // Cover 30 days of sales using the 7d trend, minus what we have.
  const target = Math.ceil(avg7 * 30);
  const suggestedReorderQty = Math.max(0, target - safe);

  return {
    avgDailySales7d: avg7,
    avgDailySales30d: avg30,
    currentStock: safe,
    daysOfStockRemaining: daysLeft,
    safetyStock,
    reorderPoint,
    reorderSuggested,
    isDeadStock,
    suggestedReorderQty,
  };
}
