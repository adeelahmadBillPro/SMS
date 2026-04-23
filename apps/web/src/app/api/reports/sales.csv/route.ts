import { type NextRequest } from "next/server";
import { requireShop } from "@/lib/require-shop";
import { csvResponse, toCsv, type CsvRow } from "@/lib/csv";
import { resolveRange } from "@/app/reports/date-range";
import { getSalesReport } from "@/app/reports/queries";

export async function GET(req: NextRequest): Promise<Response> {
  const { membership } = await requireShop();
  const sp = {
    preset: req.nextUrl.searchParams.get("preset") ?? undefined,
    from: req.nextUrl.searchParams.get("from") ?? undefined,
    to: req.nextUrl.searchParams.get("to") ?? undefined,
  };
  const range = resolveRange(sp);
  const report = await getSalesReport(membership.shopId, range);

  const header = [
    "Section", "Day", "Method", "Category", "Product", "SKU",
    "Qty", "Bills", "Revenue", "Tax", "COGS", "Credit",
  ];
  const rows: CsvRow[] = [];
  rows.push([
    "Totals", `${range.from} → ${range.to}`, "", "", "", "",
    "", report.totals.bills,
    report.totals.grossRevenue, report.totals.tax, report.totals.cogs, report.totals.creditSales,
  ]);
  for (const d of report.byDay) {
    rows.push(["Day", d.day, "", "", "", "", "", d.bills, d.total, d.tax, d.cogs, ""]);
  }
  for (const m of report.byMethod) {
    rows.push(["Method", "", m.method, "", "", "", "", "", m.amount, "", "", ""]);
  }
  for (const c of report.byCategory) {
    rows.push(["Category", "", "", c.category, "", "", c.qty, "", c.revenue, "", "", ""]);
  }
  for (const p of report.topProducts) {
    rows.push(["Top Product", "", "", "", p.name, p.sku, p.qty, "", p.revenue, "", "", ""]);
  }

  return csvResponse(`sales_${range.from}_${range.to}.csv`, toCsv(header, rows));
}
