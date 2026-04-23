import { requireShop } from "@/lib/require-shop";
import { csvResponse, toCsv, type CsvRow } from "@/lib/csv";
import { getStockValuation } from "@/app/reports/queries";

export async function GET(): Promise<Response> {
  const { membership } = await requireShop();
  const report = await getStockValuation(membership.shopId);

  const header = [
    "SKU", "Name", "Category", "Qty", "Unit cost", "Unit price", "Cost value", "Retail value",
  ];
  const rows: CsvRow[] = report.rows.map((r) => [
    r.sku, r.name, r.category, r.qty, r.unitCost, r.unitPrice, r.costValue, r.retailValue,
  ]);
  rows.push([
    "",
    "TOTALS",
    "",
    report.totals.qty,
    "",
    "",
    report.totals.costValue,
    report.totals.retailValue,
  ]);
  return csvResponse(`stock_valuation.csv`, toCsv(header, rows));
}
