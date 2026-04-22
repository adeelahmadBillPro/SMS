import "server-only";
import { withShop } from "@shopos/db";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  cnic: string | null;
  creditLimit: number;
  outstanding: number;
}

/**
 * Outstanding receivable balance per customer:
 *   outstanding = opening_balance
 *               + SUM(sale.credit_amount)
 *               - SUM(payment.amount WHERE party_type=CUSTOMER AND sale_id IS NULL)
 *
 * Computed in SQL for speed — run on the list page and on the POS customer
 * picker on every keystroke.
 */
export async function listCustomers(
  shopId: string,
  opts: { search?: string; limit?: number } = {},
): Promise<CustomerRow[]> {
  const search = opts.search?.trim() ?? "";
  const pattern = search ? `%${search}%` : null;
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);

  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        phone: string | null;
        cnic: string | null;
        credit_limit: string;
        outstanding: string;
      }>
    >(
      `
      SELECT
        c.id, c.name, c.phone, c.cnic, c.credit_limit,
        (
          COALESCE(c.opening_balance, 0)
          + COALESCE((SELECT SUM(s.credit_amount) FROM sale s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.customer_id = c.id AND p.shop_id = c.shop_id AND p.sale_id IS NULL), 0)
        ) AS outstanding
      FROM customer c
      WHERE ($1::text IS NULL OR c.name ILIKE $1 OR c.phone ILIKE $1 OR c.cnic ILIKE $1)
      ORDER BY c.name ASC
      LIMIT ${limit}
      `,
      pattern,
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      cnic: r.cnic,
      creditLimit: Number(r.credit_limit),
      outstanding: Number(r.outstanding),
    }));
  });
}

export interface CustomerTimelineEntry {
  kind: "OPENING" | "SALE" | "PAYMENT";
  date: Date;
  refId: string | null;
  label: string;
  /** Customer's debt going up (credit sale) */
  debit: number;
  /** Customer's debt going down (payment received) */
  credit: number;
  runningBalance: number;
}

export interface CustomerDetail extends CustomerRow {
  openingBalance: number;
  timeline: CustomerTimelineEntry[];
}

export async function getCustomer(shopId: string, customerId: string): Promise<CustomerDetail | null> {
  return withShop(shopId, async (tx) => {
    const c = await tx.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: { orderBy: { soldAt: "asc" } },
        payments: {
          where: { partyType: "CUSTOMER", saleId: null },
          orderBy: { paidAt: "asc" },
        },
      },
    });
    if (!c) return null;

    const entries: Omit<CustomerTimelineEntry, "runningBalance">[] = [];
    if (Number(c.openingBalance) !== 0) {
      entries.push({
        kind: "OPENING",
        date: c.createdAt,
        refId: null,
        label: "Opening balance",
        debit: Number(c.openingBalance),
        credit: 0,
      });
    }
    for (const s of c.sales) {
      if (Number(s.creditAmount) > 0) {
        entries.push({
          kind: "SALE",
          date: s.soldAt,
          refId: s.id,
          label: `Credit sale (bill ${s.id.slice(0, 8).toUpperCase()})`,
          debit: Number(s.creditAmount),
          credit: 0,
        });
      }
    }
    for (const p of c.payments) {
      entries.push({
        kind: "PAYMENT",
        date: p.paidAt,
        refId: p.id,
        label: `Payment received (${p.method})`,
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
      id: c.id,
      name: c.name,
      phone: c.phone,
      cnic: c.cnic,
      creditLimit: Number(c.creditLimit),
      outstanding: running,
      openingBalance: Number(c.openingBalance),
      timeline,
    };
  });
}

export async function totalCustomerReceivables(shopId: string): Promise<number> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ total: string }>>(
      `
      SELECT COALESCE(SUM(
          COALESCE(c.opening_balance, 0)
          + COALESCE((SELECT SUM(s.credit_amount) FROM sale s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.customer_id = c.id AND p.shop_id = c.shop_id AND p.sale_id IS NULL), 0)
      ), 0) AS total
      FROM customer c
      `,
    );
    return Math.max(0, Number(rows[0]?.total ?? 0));
  });
}

export async function getCustomerOutstanding(shopId: string, customerId: string): Promise<number> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ outstanding: string }>>(
      `
      SELECT
        (
          COALESCE(c.opening_balance, 0)
          + COALESCE((SELECT SUM(s.credit_amount) FROM sale s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id), 0)
          - COALESCE((SELECT SUM(p.amount) FROM payment p WHERE p.customer_id = c.id AND p.shop_id = c.shop_id AND p.sale_id IS NULL), 0)
        ) AS outstanding
      FROM customer c
      WHERE c.id = $1
      `,
      customerId,
    );
    return Number(rows[0]?.outstanding ?? 0);
  });
}
