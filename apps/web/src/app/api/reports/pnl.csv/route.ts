import { type NextRequest } from "next/server";
import { requireShop } from "@/lib/require-shop";
import { csvResponse, toCsv, type CsvRow } from "@/lib/csv";
import { resolveRange } from "@/app/reports/date-range";
import { getPnl } from "@/app/reports/queries";

export async function GET(req: NextRequest): Promise<Response> {
  const { membership } = await requireShop();
  const sp = {
    preset: req.nextUrl.searchParams.get("preset") ?? undefined,
    from: req.nextUrl.searchParams.get("from") ?? undefined,
    to: req.nextUrl.searchParams.get("to") ?? undefined,
  };
  const range = resolveRange(sp);
  const pnl = await getPnl(membership.shopId, range);

  const header = ["Line", "Amount (PKR)"];
  const rows: CsvRow[] = [
    ["Period", `${range.from} → ${range.to}`],
    ["Revenue (ex-tax)", pnl.revenueExTax],
    ["COGS", pnl.cogs],
    ["Gross profit", pnl.grossProfit],
    ["Operating expenses", pnl.expenses],
    ["Net profit", pnl.netProfit],
    ["Margin %", pnl.marginPct],
    ["Tax collected (held for FBR)", pnl.taxCollected],
  ];
  for (const c of pnl.expensesByCategory) {
    rows.push([`  Expense · ${c.category}`, c.amount]);
  }
  return csvResponse(`pnl_${range.from}_${range.to}.csv`, toCsv(header, rows));
}
