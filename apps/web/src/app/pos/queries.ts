import "server-only";
import { withShop } from "@shopos/db";

export interface PosProductHit {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  price: number;
  cost: number;
  taxRate: number;
  barcode: string | null;
  hasImei: boolean;
  hasSerial: boolean;
  currentQty: number;
  variants: Array<{
    id: string;
    color: string | null;
    storage: string | null;
    ram: string | null;
    priceOverride: number | null;
    costOverride: number | null;
    currentQty: number;
  }>;
}

/**
 * Typeahead + barcode lookup. An exact barcode match short-circuits so a
 * hand scanner returning "354..." + Enter lands a single product.
 */
export async function searchProductsForPos(
  shopId: string,
  q: string,
  limit = 25,
): Promise<PosProductHit[]> {
  const query = q.trim();
  if (!query) return [];

  return withShop(shopId, async (tx) => {
    // Exact barcode hit first (single-row path for scanners).
    if (/^[A-Za-z0-9][A-Za-z0-9-]{3,63}$/.test(query)) {
      const exact = await tx.product.findFirst({
        where: { barcode: query, isActive: true },
        select: { id: true },
      });
      if (exact) return hydrate(tx, shopId, [exact.id]);
    }

    const pattern = `%${query}%`;
    const rows = await tx.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { barcode: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
      take: limit,
      select: { id: true },
    });
    // Suppress unused-var warning; pattern kept for future ILIKE rank.
    void pattern;
    return hydrate(tx, shopId, rows.map((r) => r.id));
  });
}

async function hydrate(
  tx: import("@shopos/db").Prisma.TransactionClient,
  shopId: string,
  ids: string[],
): Promise<PosProductHit[]> {
  if (ids.length === 0) return [];
  const [products, qtyRows] = await Promise.all([
    tx.product.findMany({
      where: { id: { in: ids } },
      include: { variants: true },
    }),
    tx.$queryRawUnsafe<
      Array<{ product_id: string; variant_id: string | null; current_qty: bigint }>
    >(
      `SELECT product_id, variant_id, COALESCE(SUM(qty_delta), 0)::bigint AS current_qty
         FROM stock_movement
        WHERE shop_id = $1::uuid AND product_id = ANY($2::uuid[])
        GROUP BY product_id, variant_id`,
      shopId,
      ids,
    ),
  ]);

  const qtyMap = new Map<string, number>();
  for (const row of qtyRows) {
    qtyMap.set(`${row.product_id}::${row.variant_id ?? ""}`, Number(row.current_qty));
  }

  const orderIndex = new Map(ids.map((id, i) => [id, i]));
  return products
    .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))
    .map((p) => {
      const totalQty = Array.from(qtyMap.entries())
        .filter(([k]) => k.startsWith(`${p.id}::`))
        .reduce((acc, [, v]) => acc + v, 0);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand,
        model: p.model,
        price: Number(p.price),
        cost: Number(p.cost),
        taxRate: Number(p.taxRate),
        barcode: p.barcode,
        hasImei: p.hasImei,
        hasSerial: p.hasSerial,
        currentQty: totalQty,
        variants: p.variants.map((v) => ({
          id: v.id,
          color: v.color,
          storage: v.storage,
          ram: v.ram,
          priceOverride: v.priceOverride != null ? Number(v.priceOverride) : null,
          costOverride: v.costOverride != null ? Number(v.costOverride) : null,
          currentQty: qtyMap.get(`${p.id}::${v.id}`) ?? 0,
        })),
      };
    });
}

export interface PosSaleSummary {
  id: string;
  total: number;
  tax: number;
  subtotal: number;
  discount: number;
  creditAmount: number;
  soldAt: Date;
  customer: { id: string; name: string; phone: string | null } | null;
  cashier: { email: string };
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    qty: number;
    unitPrice: number;
    discount: number;
    tax: number;
    lineTotal: number;
    imei: string | null;
    serial: string | null;
  }>;
  payments: Array<{ id: string; method: string; amount: number }>;
  fbrStatus: "NONE" | "PENDING" | "POSTED" | "FAILED";
  fbrInvoiceNumber: string | null;
  fbrQrCode: string | null;
  fbrError: string | null;
}

export async function getSaleForReceipt(shopId: string, saleId: string): Promise<PosSaleSummary | null> {
  return withShop(shopId, async (tx) => {
    const s = await tx.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        cashier: { select: { email: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            stockItem: { select: { imei: true, serial: true } },
          },
          orderBy: { id: "asc" },
        },
        payments: { orderBy: { paidAt: "asc" } },
      },
    });
    if (!s) return null;
    return {
      id: s.id,
      total: Number(s.total),
      tax: Number(s.tax),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      creditAmount: Number(s.creditAmount),
      soldAt: s.soldAt,
      customer: s.customer,
      cashier: s.cashier,
      items: s.items.map((it) => ({
        id: it.id,
        productName: it.product.name,
        sku: it.product.sku,
        qty: it.qty,
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        tax: Number(it.tax),
        lineTotal: Number(it.lineTotal),
        imei: it.stockItem?.imei ?? null,
        serial: it.stockItem?.serial ?? null,
      })),
      payments: s.payments.map((p) => ({
        id: p.id,
        method: p.method,
        amount: Number(p.amount),
      })),
      fbrStatus: s.fbrStatus,
      fbrInvoiceNumber: s.fbrInvoiceNumber,
      fbrQrCode: s.fbrQrCode,
      fbrError: s.fbrError,
    };
  });
}

export async function todaysSalesSummary(
  shopId: string,
  nowPkt: Date = new Date(),
): Promise<{ count: number; total: number; cash: number }> {
  // Day boundaries in Asia/Karachi (UTC+5, no DST).
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
  const inPkt = new Date(nowPkt.getTime() + PKT_OFFSET_MS);
  const pktMidnight = new Date(Date.UTC(inPkt.getUTCFullYear(), inPkt.getUTCMonth(), inPkt.getUTCDate()));
  const start = new Date(pktMidnight.getTime() - PKT_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{ n: bigint; total: string | null; cash: string | null }>
    >(
      `
      SELECT
        count(*)::bigint AS n,
        COALESCE(SUM(s.total), 0) AS total,
        COALESCE((SELECT SUM(p.amount)
                    FROM payment p
                   WHERE p.shop_id = $1::uuid
                     AND p.paid_at >= $2 AND p.paid_at < $3
                     AND p.method = 'CASH'
                     AND p.sale_id IS NOT NULL), 0) AS cash
      FROM sale s
      WHERE s.shop_id = $1::uuid AND s.sold_at >= $2 AND s.sold_at < $3
      `,
      shopId,
      start,
      end,
    );
    const r = rows[0];
    return {
      count: Number(r?.n ?? 0),
      total: Number(r?.total ?? 0),
      cash: Number(r?.cash ?? 0),
    };
  });
}
