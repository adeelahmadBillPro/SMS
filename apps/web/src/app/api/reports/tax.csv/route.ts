import { type NextRequest } from "next/server";
import { requireShop } from "@/lib/require-shop";
import { csvResponse, toCsv, type CsvRow } from "@/lib/csv";
import { resolveRange } from "@/app/reports/date-range";
import { getTaxSummary } from "@/app/reports/queries";

export async function GET(req: NextRequest): Promise<Response> {
  const { membership } = await requireShop();
  const sp = {
    preset: req.nextUrl.searchParams.get("preset") ?? undefined,
    from: req.nextUrl.searchParams.get("from") ?? undefined,
    to: req.nextUrl.searchParams.get("to") ?? undefined,
  };
  const range = resolveRange(sp);
  const report = await getTaxSummary(membership.shopId, range);

  const header = ["Section", "Day/Rate", "Base", "Sales tax", "Purchase tax", "Net"];
  const rows: CsvRow[] = [];
  rows.push([
    "Totals",
    `${range.from} → ${range.to}`,
    "",
    report.salesTaxCollected,
    report.purchaseTaxPaid,
    report.netPayable,
  ]);
  for (const r of report.byRate) {
    rows.push(["Rate", `${r.rate}%`, r.base, r.tax, "", ""]);
  }
  for (const d of report.byDay) {
    const net = Math.round((d.salesTax - d.purchaseTax) * 100) / 100;
    rows.push(["Day", d.day, "", d.salesTax, d.purchaseTax, net]);
  }
  return csvResponse(`tax_${range.from}_${range.to}.csv`, toCsv(header, rows));
}
