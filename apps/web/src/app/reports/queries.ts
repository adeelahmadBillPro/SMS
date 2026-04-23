import "server-only";
import { withShop } from "@shopos/db";
import { rangeToBoundary, type DateRange } from "./date-range";

// ----------------------------------------------------------------------------
// Sales report
// ----------------------------------------------------------------------------

export interface SalesReport {
  range: DateRange;
  totals: {
    bills: number;
    grossRevenue: number;   // sum(sale.total)
    netRevenue: number;     // sum(sale.total - sale.tax)
    tax: number;
    discount: number;
    cogs: number;           // sum(sale_item.unit_cost * sale_item.qty)
    grossProfit: number;    // netRevenue - cogs
    creditSales: number;    // sum(sale.credit_amount)
  };
  byDay: Array<{ day: string; bills: number; total: number; tax: number; cogs: number }>;
  byMethod: Array<{ method: string; amount: number }>;
  byCategory: Array<{ category: string; qty: number; revenue: number }>;
  topProducts: Array<{ productId: string; name: string; sku: string; qty: number; revenue: number }>;
}

export async function getSalesReport(shopId: string, range: DateRange): Promise<SalesReport> {
  const { start, end } = rangeToBoundary(range);
  return withShop(shopId, async (tx) => {
    const [totalsRow, byDayRows, byMethodRows, byCatRows, topProductsRows] = await Promise.all([
      tx.$queryRawUnsafe<
        Array<{
          bills: bigint;
          gross: string;
          net: string;
          tax: string;
          discount: string;
          cogs: string;
          credit: string;
        }>
      >(
        `SELECT
           COUNT(*)::bigint AS bills,
           COALESCE(SUM(s.total), 0) AS gross,
           COALESCE(SUM(s.total - s.tax), 0) AS net,
           COALESCE(SUM(s.tax), 0) AS tax,
           COALESCE(SUM(s.discount), 0) AS discount,
           COALESCE((SELECT SUM(si.unit_cost * si.qty) FROM sale_item si
                      JOIN sale s2 ON s2.id = si.sale_id
                      WHERE s2.shop_id = $1 AND s2.sold_at >= $2 AND s2.sold_at < $3), 0) AS cogs,
           COALESCE(SUM(s.credit_amount), 0) AS credit
         FROM sale s
         WHERE s.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3`,
        shopId, start, end,
      ),
      // Day bucket in Asia/Karachi. Postgres AT TIME ZONE gives us a timestamp
      // in the target zone we can truncate cleanly.
      tx.$queryRawUnsafe<
        Array<{ day: string; bills: bigint; total: string; tax: string; cogs: string }>
      >(
        `SELECT to_char((s.sold_at AT TIME ZONE 'Asia/Karachi')::date, 'YYYY-MM-DD') AS day,
                COUNT(*)::bigint AS bills,
                COALESCE(SUM(s.total), 0) AS total,
                COALESCE(SUM(s.tax), 0) AS tax,
                COALESCE((SELECT SUM(si.unit_cost * si.qty) FROM sale_item si
                           WHERE si.sale_id = s.id), 0) AS cogs
           FROM sale s
          WHERE s.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
          GROUP BY day
          ORDER BY day ASC`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ method: string; amount: string }>>(
        `SELECT method, COALESCE(SUM(amount), 0) AS amount
           FROM payment
          WHERE shop_id = $1 AND paid_at >= $2 AND paid_at < $3 AND sale_id IS NOT NULL
          GROUP BY method
          ORDER BY amount DESC`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ category: string; qty: bigint; revenue: string }>>(
        `SELECT p.category::text AS category,
                COALESCE(SUM(si.qty), 0)::bigint AS qty,
                COALESCE(SUM(si.line_total), 0) AS revenue
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
           JOIN product p ON p.id = si.product_id
          WHERE si.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
          GROUP BY p.category
          ORDER BY revenue DESC`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<
        Array<{ product_id: string; name: string; sku: string; qty: bigint; revenue: string }>
      >(
        `SELECT si.product_id, p.name, p.sku,
                COALESCE(SUM(si.qty), 0)::bigint AS qty,
                COALESCE(SUM(si.line_total), 0) AS revenue
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
           JOIN product p ON p.id = si.product_id
          WHERE si.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
          GROUP BY si.product_id, p.name, p.sku
          ORDER BY revenue DESC
          LIMIT 20`,
        shopId, start, end,
      ),
    ]);

    const t = totalsRow[0];
    const grossRevenue = Number(t?.gross ?? 0);
    const netRevenue = Number(t?.net ?? 0);
    const cogs = Number(t?.cogs ?? 0);

    return {
      range,
      totals: {
        bills: Number(t?.bills ?? 0),
        grossRevenue,
        netRevenue,
        tax: Number(t?.tax ?? 0),
        discount: Number(t?.discount ?? 0),
        cogs,
        grossProfit: Math.round((netRevenue - cogs) * 100) / 100,
        creditSales: Number(t?.credit ?? 0),
      },
      byDay: byDayRows.map((r) => ({
        day: r.day,
        bills: Number(r.bills),
        total: Number(r.total),
        tax: Number(r.tax),
        cogs: Number(r.cogs),
      })),
      byMethod: byMethodRows.map((r) => ({ method: r.method, amount: Number(r.amount) })),
      byCategory: byCatRows.map((r) => ({
        category: r.category,
        qty: Number(r.qty),
        revenue: Number(r.revenue),
      })),
      topProducts: topProductsRows.map((r) => ({
        productId: r.product_id,
        name: r.name,
        sku: r.sku,
        qty: Number(r.qty),
        revenue: Number(r.revenue),
      })),
    };
  });
}

// ----------------------------------------------------------------------------
// Stock valuation (snapshot of "now" — date range ignored)
// ----------------------------------------------------------------------------

export interface StockValuationRow {
  productId: string;
  sku: string;
  name: string;
  category: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  costValue: number;
  retailValue: number;
}

export interface StockValuationReport {
  rows: StockValuationRow[];
  totals: { qty: number; costValue: number; retailValue: number; potentialProfit: number };
}

export async function getStockValuation(shopId: string): Promise<StockValuationReport> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        product_id: string;
        sku: string;
        name: string;
        category: string;
        qty: bigint;
        cost: string;
        price: string;
      }>
    >(
      `SELECT p.id AS product_id, p.sku, p.name, p.category::text AS category,
              COALESCE(SUM(sm.qty_delta), 0)::bigint AS qty,
              p.cost, p.price
         FROM product p
         LEFT JOIN stock_movement sm ON sm.product_id = p.id AND sm.shop_id = p.shop_id
        WHERE p.is_active = true
        GROUP BY p.id
        HAVING COALESCE(SUM(sm.qty_delta), 0) <> 0
        ORDER BY p.name ASC`,
    );

    let totalQty = 0;
    let totalCost = 0;
    let totalRetail = 0;
    const mapped: StockValuationRow[] = rows.map((r) => {
      const qty = Number(r.qty);
      const cost = Number(r.cost);
      const price = Number(r.price);
      const costValue = Math.round(qty * cost * 100) / 100;
      const retailValue = Math.round(qty * price * 100) / 100;
      totalQty += qty;
      totalCost += costValue;
      totalRetail += retailValue;
      return {
        productId: r.product_id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        qty,
        unitCost: cost,
        unitPrice: price,
        costValue,
        retailValue,
      };
    });

    return {
      rows: mapped,
      totals: {
        qty: totalQty,
        costValue: Math.round(totalCost * 100) / 100,
        retailValue: Math.round(totalRetail * 100) / 100,
        potentialProfit: Math.round((totalRetail - totalCost) * 100) / 100,
      },
    };
  });
}

// ----------------------------------------------------------------------------
// Profit & Loss
// ----------------------------------------------------------------------------

export interface PnlReport {
  range: DateRange;
  revenueExTax: number;  // sales total minus collected tax
  taxCollected: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  expensesByCategory: Array<{ category: string; amount: number }>;
  netProfit: number;
  marginPct: number;
}

export async function getPnl(shopId: string, range: DateRange): Promise<PnlReport> {
  const { start, end } = rangeToBoundary(range);
  return withShop(shopId, async (tx) => {
    const [salesRow, cogsRow, expRow, expByCatRows] = await Promise.all([
      tx.$queryRawUnsafe<Array<{ total: string; tax: string }>>(
        `SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(tax), 0) AS tax
           FROM sale
          WHERE shop_id = $1 AND sold_at >= $2 AND sold_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ cogs: string }>>(
        `SELECT COALESCE(SUM(si.unit_cost * si.qty), 0) AS cogs
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
          WHERE si.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expense
          WHERE shop_id = $1 AND paid_at >= $2 AND paid_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ category: string; amount: string }>>(
        `SELECT category, COALESCE(SUM(amount), 0) AS amount FROM expense
          WHERE shop_id = $1 AND paid_at >= $2 AND paid_at < $3
          GROUP BY category
          ORDER BY amount DESC`,
        shopId, start, end,
      ),
    ]);

    const total = Number(salesRow[0]?.total ?? 0);
    const tax = Number(salesRow[0]?.tax ?? 0);
    const revenueExTax = Math.round((total - tax) * 100) / 100;
    const cogs = Number(cogsRow[0]?.cogs ?? 0);
    const grossProfit = Math.round((revenueExTax - cogs) * 100) / 100;
    const expenses = Number(expRow[0]?.total ?? 0);
    const netProfit = Math.round((grossProfit - expenses) * 100) / 100;
    const marginPct = revenueExTax > 0 ? Math.round((netProfit / revenueExTax) * 10_000) / 100 : 0;

    return {
      range,
      revenueExTax,
      taxCollected: tax,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit,
      expenses: Math.round(expenses * 100) / 100,
      expensesByCategory: expByCatRows.map((r) => ({
        category: r.category,
        amount: Number(r.amount),
      })),
      netProfit,
      marginPct,
    };
  });
}

// ----------------------------------------------------------------------------
// Customer aging
// ----------------------------------------------------------------------------

export interface AgingRow {
  customerId: string;
  name: string;
  phone: string | null;
  current: number;       // 0-30 days
  d31_60: number;
  d61_90: number;
  over90: number;
  total: number;
  oldestDays: number;
}

export interface AgingReport {
  asOf: string; // YYYY-MM-DD
  rows: AgingRow[];
  totals: {
    current: number;
    d31_60: number;
    d61_90: number;
    over90: number;
    total: number;
  };
}

export async function getCustomerAging(shopId: string, asOfYmd: string): Promise<AgingReport> {
  return withShop(shopId, async (tx) => {
    // Bucket each customer's outstanding balance by age of oldest credit
    // activity. For simplicity, we don't FIFO-apply payments — we compute
    // total outstanding and the age of the oldest unsettled credit sale.
    const rows = await tx.$queryRawUnsafe<
      Array<{
        customer_id: string;
        name: string;
        phone: string | null;
        outstanding: string;
        bucket_current: string;
        bucket_31_60: string;
        bucket_61_90: string;
        bucket_over90: string;
        oldest_days: number | null;
      }>
    >(
      `WITH today AS (SELECT to_date($1, 'YYYY-MM-DD') AS d),
       cust_bal AS (
         SELECT c.id AS customer_id, c.name, c.phone,
                (
                  COALESCE(c.opening_balance, 0)
                  + COALESCE((SELECT SUM(s.credit_amount) FROM sale s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id), 0)
                  - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.customer_id = c.id AND p.shop_id = c.shop_id AND p.sale_id IS NULL), 0)
                ) AS outstanding
           FROM customer c
       ),
       buckets AS (
         SELECT s.customer_id,
                SUM(CASE WHEN (today.d - (s.sold_at AT TIME ZONE 'Asia/Karachi')::date) <= 30 THEN s.credit_amount ELSE 0 END) AS bucket_current,
                SUM(CASE WHEN (today.d - (s.sold_at AT TIME ZONE 'Asia/Karachi')::date) BETWEEN 31 AND 60 THEN s.credit_amount ELSE 0 END) AS bucket_31_60,
                SUM(CASE WHEN (today.d - (s.sold_at AT TIME ZONE 'Asia/Karachi')::date) BETWEEN 61 AND 90 THEN s.credit_amount ELSE 0 END) AS bucket_61_90,
                SUM(CASE WHEN (today.d - (s.sold_at AT TIME ZONE 'Asia/Karachi')::date) > 90 THEN s.credit_amount ELSE 0 END) AS bucket_over90,
                MAX(today.d - (s.sold_at AT TIME ZONE 'Asia/Karachi')::date) AS oldest_days
           FROM sale s, today
          WHERE s.credit_amount > 0 AND s.customer_id IS NOT NULL
          GROUP BY s.customer_id
       )
       SELECT cb.customer_id, cb.name, cb.phone, cb.outstanding,
              COALESCE(b.bucket_current, 0) AS bucket_current,
              COALESCE(b.bucket_31_60, 0)  AS bucket_31_60,
              COALESCE(b.bucket_61_90, 0)  AS bucket_61_90,
              COALESCE(b.bucket_over90, 0) AS bucket_over90,
              b.oldest_days
         FROM cust_bal cb
         LEFT JOIN buckets b ON b.customer_id = cb.customer_id
        WHERE cb.outstanding > 0
        ORDER BY cb.outstanding DESC`,
      asOfYmd,
    );

    const mapped: AgingRow[] = rows.map((r) => {
      const total = Number(r.outstanding);
      return {
        customerId: r.customer_id,
        name: r.name,
        phone: r.phone,
        current: Number(r.bucket_current),
        d31_60: Number(r.bucket_31_60),
        d61_90: Number(r.bucket_61_90),
        over90: Number(r.bucket_over90),
        total,
        oldestDays: r.oldest_days ?? 0,
      };
    });

    const totals = mapped.reduce(
      (a, r) => ({
        current: a.current + r.current,
        d31_60: a.d31_60 + r.d31_60,
        d61_90: a.d61_90 + r.d61_90,
        over90: a.over90 + r.over90,
        total: a.total + r.total,
      }),
      { current: 0, d31_60: 0, d61_90: 0, over90: 0, total: 0 },
    );

    return { asOf: asOfYmd, rows: mapped, totals };
  });
}

// ----------------------------------------------------------------------------
// Tax summary
// ----------------------------------------------------------------------------

export interface TaxReport {
  range: DateRange;
  salesTaxCollected: number;
  purchaseTaxPaid: number;     // Purchase.tax aggregate; Phase 2 splits to input-tax acct
  netPayable: number;
  byRate: Array<{ rate: number; base: number; tax: number }>;
  byDay: Array<{ day: string; salesTax: number; purchaseTax: number }>;
}

export async function getTaxSummary(shopId: string, range: DateRange): Promise<TaxReport> {
  const { start, end } = rangeToBoundary(range);
  return withShop(shopId, async (tx) => {
    const [salesTaxRow, purchaseTaxRow, byRateRows, byDayRows] = await Promise.all([
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(tax), 0) AS total FROM sale
          WHERE shop_id = $1 AND sold_at >= $2 AND sold_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(tax), 0) AS total FROM purchase
          WHERE shop_id = $1 AND purchased_at >= $2 AND purchased_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ rate: string; base: string; tax: string }>>(
        `SELECT p.tax_rate::text AS rate,
                COALESCE(SUM(si.line_total - si.tax), 0) AS base,
                COALESCE(SUM(si.tax), 0) AS tax
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
           JOIN product p ON p.id = si.product_id
          WHERE si.shop_id = $1 AND s.sold_at >= $2 AND s.sold_at < $3
          GROUP BY p.tax_rate
          ORDER BY p.tax_rate ASC`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ day: string; sales_tax: string; purchase_tax: string }>>(
        `SELECT d::text AS day,
                COALESCE((SELECT SUM(tax) FROM sale WHERE shop_id = $1
                           AND (sold_at AT TIME ZONE 'Asia/Karachi')::date = d), 0) AS sales_tax,
                COALESCE((SELECT SUM(tax) FROM purchase WHERE shop_id = $1
                           AND (purchased_at AT TIME ZONE 'Asia/Karachi')::date = d), 0) AS purchase_tax
           FROM generate_series($2::date, $3::date, interval '1 day') AS d
          ORDER BY d ASC`,
        shopId,
        range.from,
        range.to,
      ),
    ]);

    const salesTax = Number(salesTaxRow[0]?.total ?? 0);
    const purchaseTax = Number(purchaseTaxRow[0]?.total ?? 0);
    return {
      range,
      salesTaxCollected: salesTax,
      purchaseTaxPaid: purchaseTax,
      netPayable: Math.round((salesTax - purchaseTax) * 100) / 100,
      byRate: byRateRows.map((r) => ({
        rate: Number(r.rate),
        base: Number(r.base),
        tax: Number(r.tax),
      })),
      byDay: byDayRows.map((r) => ({
        day: r.day,
        salesTax: Number(r.sales_tax),
        purchaseTax: Number(r.purchase_tax),
      })),
    };
  });
}
