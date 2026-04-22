import "server-only";
import { withShop } from "@shopos/db";

export interface PurchaseRow {
  id: string;
  invoiceNo: string | null;
  supplierName: string;
  supplierId: string;
  purchasedAt: Date;
  total: number;
  paid: number;
  balance: number;
  itemCount: number;
}

export async function listPurchases(
  shopId: string,
  opts: { supplierId?: string; limit?: number } = {},
): Promise<PurchaseRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        invoice_no: string | null;
        supplier_name: string;
        supplier_id: string;
        purchased_at: Date;
        total: string;
        paid: string;
        item_count: bigint;
      }>
    >(
      `
      SELECT
        pu.id, pu.invoice_no, pu.supplier_id, pu.purchased_at, pu.total,
        s.name AS supplier_name,
        COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.purchase_id = pu.id), 0) AS paid,
        (SELECT COUNT(*) FROM purchase_item pi WHERE pi.purchase_id = pu.id)::bigint AS item_count
      FROM purchase pu
      JOIN supplier s ON s.id = pu.supplier_id
      WHERE ($1::uuid IS NULL OR pu.supplier_id = $1::uuid)
      ORDER BY pu.purchased_at DESC
      LIMIT ${limit}
      `,
      opts.supplierId ?? null,
    );
    return rows.map((r) => {
      const total = Number(r.total);
      const paid = Number(r.paid);
      return {
        id: r.id,
        invoiceNo: r.invoice_no,
        supplierName: r.supplier_name,
        supplierId: r.supplier_id,
        purchasedAt: r.purchased_at,
        total,
        paid,
        balance: total - paid,
        itemCount: Number(r.item_count),
      };
    });
  });
}

export interface PurchaseDetail {
  id: string;
  invoiceNo: string | null;
  supplierName: string;
  supplierId: string;
  purchasedAt: Date;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amount: number;
    paidAt: Date;
  }>;
}

export async function getPurchase(shopId: string, purchaseId: string): Promise<PurchaseDetail | null> {
  return withShop(shopId, async (tx) => {
    const p = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { name: true, sku: true } } },
        },
        payments: { orderBy: { paidAt: "asc" } },
      },
    });
    if (!p) return null;
    return {
      id: p.id,
      invoiceNo: p.invoiceNo,
      supplierName: p.supplier.name,
      supplierId: p.supplier.id,
      purchasedAt: p.purchasedAt,
      subtotal: Number(p.subtotal),
      tax: Number(p.tax),
      total: Number(p.total),
      notes: p.notes,
      items: p.items.map((it) => ({
        id: it.id,
        productName: it.product.name,
        sku: it.product.sku,
        qty: it.qty,
        unitCost: Number(it.unitCost),
        lineTotal: Number(it.lineTotal),
      })),
      payments: p.payments.map((pp) => ({
        id: pp.id,
        method: pp.method,
        amount: Number(pp.amount),
        paidAt: pp.paidAt,
      })),
    };
  });
}
