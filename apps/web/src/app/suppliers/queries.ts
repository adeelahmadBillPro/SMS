import "server-only";
import { withShop } from "@shopos/db";

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  ntn: string | null;
  openingBalance: number;
  outstanding: number; // what the shop owes the supplier
}

/**
 * Outstanding (what the shop owes):
 *   opening_balance + SUM(purchase.total) - SUM(payment.amount WHERE supplier_id=X)
 *
 * Unlike sales where customer_outstanding depends on sale.credit_amount, for
 * suppliers we count the full purchase total as a liability that payments
 * (at purchase time or later on-account) reduce.
 */
export async function listSuppliers(
  shopId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<SupplierRow[]> {
  const search = opts.search?.trim() ?? "";
  const pattern = search ? `%${search}%` : null;
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);

  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        phone: string | null;
        address: string | null;
        ntn: string | null;
        opening_balance: string;
        outstanding: string;
      }>
    >(
      `
      SELECT
        s.id, s.name, s.phone, s.address, s.ntn, s.opening_balance,
        (
          COALESCE(s.opening_balance, 0)
          + COALESCE((SELECT SUM(pu.total) FROM purchase pu WHERE pu.supplier_id = s.id AND pu.shop_id = s.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.supplier_id = s.id AND p.shop_id = s.shop_id), 0)
        ) AS outstanding
      FROM supplier s
      WHERE ($1::text IS NULL OR s.name ILIKE $1 OR s.phone ILIKE $1 OR s.ntn ILIKE $1)
      ORDER BY s.name ASC
      LIMIT ${limit}
      `,
      pattern,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      address: r.address,
      ntn: r.ntn,
      openingBalance: Number(r.opening_balance),
      outstanding: Number(r.outstanding),
    }));
  });
}

export async function getSupplierOutstanding(shopId: string, supplierId: string): Promise<number> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ outstanding: string }>>(
      `
      SELECT
        (
          COALESCE(s.opening_balance, 0)
          + COALESCE((SELECT SUM(pu.total) FROM purchase pu WHERE pu.supplier_id = s.id AND pu.shop_id = s.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.supplier_id = s.id AND p.shop_id = s.shop_id), 0)
        ) AS outstanding
      FROM supplier s
      WHERE s.id = $1
      `,
      supplierId,
    );
    return Number(rows[0]?.outstanding ?? 0);
  });
}

/**
 * Detail + running-balance timeline. Merges purchase + payment rows and
 * computes a rolling balance so the ledger view reads like a khata book.
 */
export interface SupplierTimelineEntry {
  kind: "OPENING" | "PURCHASE" | "PAYMENT";
  date: Date;
  refId: string | null;
  label: string;
  debit: number; // increases what we owe
  credit: number; // reduces what we owe
  runningBalance: number;
}

export interface SupplierDetail extends SupplierRow {
  notes: string | null;
  timeline: SupplierTimelineEntry[];
}

export async function getSupplier(shopId: string, supplierId: string): Promise<SupplierDetail | null> {
  return withShop(shopId, async (tx) => {
    const s = await tx.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchases: { orderBy: { purchasedAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    });
    if (!s) return null;

    const entries: Omit<SupplierTimelineEntry, "runningBalance">[] = [];
    if (Number(s.openingBalance) !== 0) {
      entries.push({
        kind: "OPENING",
        date: s.createdAt,
        refId: null,
        label: "Opening balance",
        debit: Number(s.openingBalance),
        credit: 0,
      });
    }
    for (const pu of s.purchases) {
      entries.push({
        kind: "PURCHASE",
        date: pu.purchasedAt,
        refId: pu.id,
        label: pu.invoiceNo ? `Purchase ${pu.invoiceNo}` : "Purchase",
        debit: Number(pu.total),
        credit: 0,
      });
    }
    for (const p of s.payments) {
      entries.push({
        kind: "PAYMENT",
        date: p.paidAt,
        refId: p.id,
        label: p.purchaseId ? `Paid on purchase (${p.method})` : `On-account payment (${p.method})`,
        debit: 0,
        credit: Number(p.amount),
      });
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    const timeline = entries.map((e) => {
      running = running + e.debit - e.credit;
      return { ...e, runningBalance: running };
    });

    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      address: s.address,
      ntn: s.ntn,
      openingBalance: Number(s.openingBalance),
      outstanding: running,
      notes: s.notes,
      timeline,
    };
  });
}

export async function totalSupplierDues(shopId: string): Promise<number> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ total: string }>>(
      `
      SELECT COALESCE(SUM(
          COALESCE(s.opening_balance, 0)
          + COALESCE((SELECT SUM(pu.total) FROM purchase pu WHERE pu.supplier_id = s.id AND pu.shop_id = s.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.supplier_id = s.id AND p.shop_id = s.shop_id), 0)
      ), 0) AS total
      FROM supplier s
      `,
    );
    return Math.max(0, Number(rows[0]?.total ?? 0));
  });
}
