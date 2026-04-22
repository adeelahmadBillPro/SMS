import "server-only";
import { withShop } from "@shopos/db";

export interface ProductListRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  price: number;
  cost: number;
  currentQty: number;
  lowStockThreshold: number;
  isLow: boolean;
  hasImei: boolean;
  hasSerial: boolean;
  isActive: boolean;
}

/**
 * List products + their rolled-up current stock. One DB round trip.
 * The stock rollup is done via a LEFT JOIN + SUM so the result is sortable
 * by stock level on the SQL side.
 */
export async function listProducts(
  shopId: string,
  opts: { lowStockOnly?: boolean; search?: string } = {},
): Promise<ProductListRow[]> {
  const search = opts.search?.trim() ?? "";
  const pattern = search ? `%${search}%` : null;

  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        sku: string;
        name: string;
        category: string;
        brand: string | null;
        model: string | null;
        price: string;
        cost: string;
        current_qty: bigint | null;
        low_stock_threshold: number;
        has_imei: boolean;
        has_serial: boolean;
        is_active: boolean;
      }>
    >(
      `
      SELECT
        p.id, p.sku, p.name, p.category, p.brand, p.model,
        p.price, p.cost, p.low_stock_threshold, p.has_imei, p.has_serial, p.is_active,
        COALESCE(SUM(sm.qty_delta), 0)::bigint AS current_qty
      FROM product p
      LEFT JOIN stock_movement sm ON sm.product_id = p.id AND sm.shop_id = p.shop_id
      WHERE ($1::text IS NULL OR p.name ILIKE $1 OR p.sku ILIKE $1 OR p.barcode ILIKE $1)
      GROUP BY p.id
      ORDER BY p.name ASC
      `,
      pattern,
    );

    const out: ProductListRow[] = rows.map((r) => {
      const qty = Number(r.current_qty ?? 0);
      return {
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        brand: r.brand,
        model: r.model,
        price: Number(r.price),
        cost: Number(r.cost),
        currentQty: qty,
        lowStockThreshold: r.low_stock_threshold,
        isLow: qty <= r.low_stock_threshold,
        hasImei: r.has_imei,
        hasSerial: r.has_serial,
        isActive: r.is_active,
      };
    });

    return opts.lowStockOnly ? out.filter((p) => p.isLow && p.isActive) : out;
  });
}

export interface ProductDetail extends ProductListRow {
  unit: string;
  taxRate: number;
  barcode: string | null;
  hasWarranty: boolean;
  reorderQty: number;
  leadTimeDays: number;
  variants: Array<{
    id: string;
    color: string | null;
    storage: string | null;
    ram: string | null;
    costOverride: number | null;
    priceOverride: number | null;
    currentQty: number;
  }>;
  stockItems: Array<{
    id: string;
    imei: string | null;
    serial: string | null;
    status: string;
    acquiredAt: Date;
  }>;
  recentMovements: Array<{
    id: string;
    qtyDelta: number;
    reason: string;
    createdAt: Date;
    note: string | null;
  }>;
}

export async function getProduct(shopId: string, productId: string): Promise<ProductDetail | null> {
  return withShop(shopId, async (tx) => {
    const p = await tx.product.findUnique({
      where: { id: productId },
      include: {
        variants: true,
        stockItems: {
          where: { status: "IN_STOCK" },
          orderBy: { acquiredAt: "desc" },
          take: 50,
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    });
    if (!p) return null;

    const variantQtyRows = await tx.$queryRawUnsafe<
      Array<{ variant_id: string | null; current_qty: bigint }>
    >(
      `SELECT variant_id, COALESCE(SUM(qty_delta), 0)::bigint AS current_qty
       FROM stock_movement
       WHERE shop_id = $1 AND product_id = $2
       GROUP BY variant_id`,
      shopId,
      productId,
    );
    const variantQtyMap = new Map<string | null, number>();
    for (const row of variantQtyRows) {
      variantQtyMap.set(row.variant_id, Number(row.current_qty));
    }
    const totalQty = Array.from(variantQtyMap.values()).reduce((a, b) => a + b, 0);

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      brand: p.brand,
      model: p.model,
      unit: p.unit,
      taxRate: Number(p.taxRate),
      barcode: p.barcode,
      hasImei: p.hasImei,
      hasSerial: p.hasSerial,
      hasWarranty: p.hasWarranty,
      price: Number(p.price),
      cost: Number(p.cost),
      lowStockThreshold: p.lowStockThreshold,
      reorderQty: p.reorderQty,
      leadTimeDays: p.leadTimeDays,
      isActive: p.isActive,
      currentQty: totalQty,
      isLow: totalQty <= p.lowStockThreshold,
      variants: p.variants.map((v) => ({
        id: v.id,
        color: v.color,
        storage: v.storage,
        ram: v.ram,
        costOverride: v.costOverride != null ? Number(v.costOverride) : null,
        priceOverride: v.priceOverride != null ? Number(v.priceOverride) : null,
        currentQty: variantQtyMap.get(v.id) ?? 0,
      })),
      stockItems: p.stockItems.map((s) => ({
        id: s.id,
        imei: s.imei,
        serial: s.serial,
        status: s.status,
        acquiredAt: s.acquiredAt,
      })),
      recentMovements: p.stockMovements.map((m) => ({
        id: m.id,
        qtyDelta: m.qtyDelta,
        reason: m.reason,
        createdAt: m.createdAt,
        note: null,
      })),
    };
  });
}

export async function countLowStock(shopId: string): Promise<number> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT count(*)::bigint AS n FROM (
         SELECT p.id, p.low_stock_threshold,
                COALESCE(SUM(sm.qty_delta), 0) AS qty
         FROM product p
         LEFT JOIN stock_movement sm ON sm.product_id = p.id AND sm.shop_id = p.shop_id
         WHERE p.is_active = true
         GROUP BY p.id
         HAVING COALESCE(SUM(sm.qty_delta), 0) <= p.low_stock_threshold
       ) AS low`,
    );
    return Number(rows[0]?.n ?? 0);
  });
}
