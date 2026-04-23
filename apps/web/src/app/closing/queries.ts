import "server-only";
import { prismaAdmin, withShop } from "@shopos/db";
import { Closing } from "@shopos/core";

export interface ClosingListRow {
  id: string;
  closingDate: string;
  openingCash: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  closedAt: Date;
  reversed: boolean;
}

export async function listClosings(shopId: string, limit = 60): Promise<ClosingListRow[]> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.closing.findMany({
      orderBy: { closingDate: "desc" },
      take: limit,
    });
    return rows.map((c) => ({
      id: c.id,
      closingDate: c.closingDate.toISOString().slice(0, 10),
      openingCash: Number(c.openingCash),
      expectedCash: Number(c.expectedCash),
      actualCash: Number(c.actualCash),
      variance: Number(c.variance),
      closedAt: c.closedAt,
      reversed: !!c.reversedAt,
    }));
  });
}

export async function getClosingByDate(
  shopId: string,
  ymd: string,
): Promise<ClosingListRow | null> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<
      Array<{
        id: string;
        closing_date: Date;
        opening_cash: string;
        expected_cash: string;
        actual_cash: string;
        variance: string;
        closed_at: Date;
        reversed_at: Date | null;
      }>
    >(
      `SELECT id, closing_date, opening_cash, expected_cash, actual_cash, variance, closed_at, reversed_at
         FROM closing
        WHERE closing_date = to_date($1, 'YYYY-MM-DD')
        LIMIT 1`,
      ymd,
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      closingDate: ymd,
      openingCash: Number(r.opening_cash),
      expectedCash: Number(r.expected_cash),
      actualCash: Number(r.actual_cash),
      variance: Number(r.variance),
      closedAt: r.closed_at,
      reversed: !!r.reversed_at,
    };
  });
}

/**
 * The canonical day-closing bundle: every number the cashier needs to see
 * in one trip. Matches the SPEC §7 expected-cash formula exactly.
 */
export interface DaySnapshot {
  day: string; // YYYY-MM-DD
  openingCash: number;
  expected: {
    cashSales: number;
    cashOnAccountFromCustomers: number;
    cashPaidOnPurchase: number;
    cashOnAccountToSuppliers: number;
    cashExpenses: number;
    expectedCash: number;
  };
  sales: {
    count: number;
    total: number;
    byMethod: Array<{ method: string; amount: number }>;
    grossProfit: number;
    topSellers: Array<{ productId: string; name: string; qty: number; revenue: number }>;
  };
  purchases: {
    count: number;
    total: number;
  };
  expenses: {
    total: number;
    byCategory: Array<{ category: string; amount: number }>;
  };
  cashInHand: number;   // ledger rollup at EOD (includes today's movements)
  bankBalance: number;
}

export async function getDaySnapshot(shopId: string, ymd: string): Promise<DaySnapshot> {
  const { start, end } = Closing.pktDayBoundaryFromDateString(ymd);

  return withShop(shopId, async (tx) => {
    // Opening cash: last closing strictly before `ymd`. Otherwise Shop.openingCash
    // (global table, not under RLS — use admin client).
    const prior = await tx.closing.findFirst({
      where: { closingDate: { lt: start }, reversedAt: null },
      orderBy: { closingDate: "desc" },
      select: { actualCash: true },
    });
    let openingCash: number;
    if (prior) {
      openingCash = Number(prior.actualCash);
    } else {
      const shop = await prismaAdmin.shop.findUniqueOrThrow({
        where: { id: shopId },
        select: { openingCash: true },
      });
      openingCash = Number(shop.openingCash);
    }

    // Cash flow components (raw SQL for speed).
    const [
      cashSalesRow,
      cashCustRow,
      cashPurchaseRow,
      cashSupplierRow,
      cashExpenseRow,
      salesCountRow,
      salesTotalsByMethodRows,
      salesGrossProfitRow,
      topSellersRows,
      purchasesRow,
      expenseByCatRows,
      ledgerBalancesRows,
    ] = await Promise.all([
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payment
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND method = 'CASH' AND sale_id IS NOT NULL`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payment
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND method = 'CASH' AND sale_id IS NULL AND party_type = 'CUSTOMER'`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payment
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND method = 'CASH' AND purchase_id IS NOT NULL`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payment
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND method = 'CASH' AND purchase_id IS NULL AND party_type = 'SUPPLIER'`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM expense
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND paid_via_cash = true`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ n: bigint; total: string }>>(
        `SELECT COUNT(*)::bigint AS n, COALESCE(SUM(total), 0) AS total FROM sale
           WHERE shop_id = $1::uuid AND sold_at >= $2 AND sold_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ method: string; amount: string }>>(
        `SELECT method, COALESCE(SUM(amount), 0) AS amount FROM payment
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
             AND sale_id IS NOT NULL
           GROUP BY method`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ revenue: string; cost: string }>>(
        `SELECT COALESCE(SUM(si.line_total), 0) AS revenue,
                COALESCE(SUM(si.unit_cost * si.qty), 0) AS cost
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
          WHERE si.shop_id = $1::uuid AND s.sold_at >= $2 AND s.sold_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<
        Array<{ product_id: string; name: string; qty: bigint; revenue: string }>
      >(
        `SELECT si.product_id, p.name, COALESCE(SUM(si.qty), 0)::bigint AS qty,
                COALESCE(SUM(si.line_total), 0) AS revenue
           FROM sale_item si
           JOIN sale s ON s.id = si.sale_id
           JOIN product p ON p.id = si.product_id
          WHERE si.shop_id = $1::uuid AND s.sold_at >= $2 AND s.sold_at < $3
          GROUP BY si.product_id, p.name
          ORDER BY revenue DESC
          LIMIT 5`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ n: bigint; total: string }>>(
        `SELECT COUNT(*)::bigint AS n, COALESCE(SUM(total), 0) AS total FROM purchase
           WHERE shop_id = $1::uuid AND purchased_at >= $2 AND purchased_at < $3`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ category: string; amount: string }>>(
        `SELECT category, COALESCE(SUM(amount), 0) AS amount FROM expense
           WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3
           GROUP BY category
           ORDER BY amount DESC`,
        shopId, start, end,
      ),
      tx.$queryRawUnsafe<Array<{ code: string; balance: string }>>(
        `SELECT a.code,
                COALESCE(SUM(le.debit - le.credit), 0) AS balance
           FROM account a
           LEFT JOIN ledger_entry le ON le.account_id = a.id
          WHERE a.code IN ('1000','1100')
          GROUP BY a.code`,
      ),
    ]);

    const openingCashN = openingCash;
    const cashSales = Number(cashSalesRow[0]?.total ?? 0);
    const cashCust = Number(cashCustRow[0]?.total ?? 0);
    const cashPurchase = Number(cashPurchaseRow[0]?.total ?? 0);
    const cashSupplier = Number(cashSupplierRow[0]?.total ?? 0);
    const cashExpense = Number(cashExpenseRow[0]?.total ?? 0);

    const expected = Closing.computeExpectedCash({
      openingCash: openingCashN,
      cashSales,
      cashOnAccountFromCustomers: cashCust,
      cashPaidOnPurchase: cashPurchase,
      cashOnAccountToSuppliers: cashSupplier,
      cashExpenses: cashExpense,
    });

    const byMethod = salesTotalsByMethodRows.map((r) => ({
      method: r.method,
      amount: Number(r.amount),
    }));
    const salesGrossProfit =
      Number(salesGrossProfitRow[0]?.revenue ?? 0) -
      Number(salesGrossProfitRow[0]?.cost ?? 0);

    const topSellers = topSellersRows.map((r) => ({
      productId: r.product_id,
      name: r.name,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    }));

    const balanceByCode = new Map(ledgerBalancesRows.map((r) => [r.code, Number(r.balance)]));

    return {
      day: ymd,
      openingCash: openingCashN,
      expected: {
        cashSales,
        cashOnAccountFromCustomers: cashCust,
        cashPaidOnPurchase: cashPurchase,
        cashOnAccountToSuppliers: cashSupplier,
        cashExpenses: cashExpense,
        expectedCash: expected.expected,
      },
      sales: {
        count: Number(salesCountRow[0]?.n ?? 0),
        total: Number(salesCountRow[0]?.total ?? 0),
        byMethod,
        grossProfit: Math.round(salesGrossProfit * 100) / 100,
        topSellers,
      },
      purchases: {
        count: Number(purchasesRow[0]?.n ?? 0),
        total: Number(purchasesRow[0]?.total ?? 0),
      },
      expenses: {
        total: cashExpense + Number(
          (await tx.$queryRawUnsafe<Array<{ t: string }>>(
            `SELECT COALESCE(SUM(amount), 0) AS t FROM expense
               WHERE shop_id = $1::uuid AND paid_at >= $2 AND paid_at < $3 AND paid_via_cash = false`,
            shopId, start, end,
          ))[0]?.t ?? 0,
        ),
        byCategory: expenseByCatRows.map((r) => ({
          category: r.category,
          amount: Number(r.amount),
        })),
      },
      cashInHand: balanceByCode.get("1000") ?? 0,
      bankBalance: balanceByCode.get("1100") ?? 0,
    };
  });
}

/**
 * Cash-in-hand + bank balance from the ledger. Used on the dashboard tiles.
 */
export async function getCashAndBankBalance(
  shopId: string,
): Promise<{ cashInHand: number; bankBalance: number }> {
  return withShop(shopId, async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ code: string; balance: string }>>(
      `SELECT a.code, COALESCE(SUM(le.debit - le.credit), 0) AS balance
         FROM account a
         LEFT JOIN ledger_entry le ON le.account_id = a.id
        WHERE a.code IN ('1000','1100')
        GROUP BY a.code`,
    );
    const map = new Map(rows.map((r) => [r.code, Number(r.balance)]));
    return {
      cashInHand: map.get("1000") ?? 0,
      bankBalance: map.get("1100") ?? 0,
    };
  });
}
