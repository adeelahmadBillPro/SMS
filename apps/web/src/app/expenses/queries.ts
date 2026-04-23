import "server-only";
import { withShop } from "@shopos/db";
import { Closing } from "@shopos/core";

export interface ExpenseRow {
  id: string;
  category: string;
  amount: number;
  paidAt: Date;
  paidViaCash: boolean;
  note: string | null;
}

export async function listExpenses(
  shopId: string,
  opts: { limit?: number; day?: string } = {},
): Promise<ExpenseRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  return withShop(shopId, async (tx) => {
    let where: { paidAt?: { gte: Date; lt: Date } } = {};
    if (opts.day) {
      const { start, end } = Closing.pktDayBoundaryFromDateString(opts.day);
      where = { paidAt: { gte: start, lt: end } };
    }
    const rows = await tx.expense.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: limit,
    });
    return rows.map((e) => ({
      id: e.id,
      category: e.category,
      amount: Number(e.amount),
      paidAt: e.paidAt,
      paidViaCash: e.paidViaCash,
      note: e.note,
    }));
  });
}
