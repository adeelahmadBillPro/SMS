import { requireShop } from "@/lib/require-shop";
import { csvResponse, toCsv, type CsvRow } from "@/lib/csv";
import { Closing } from "@shopos/core";
import { getCustomerAging } from "@/app/reports/queries";

export async function GET(): Promise<Response> {
  const { membership } = await requireShop();
  const asOf = Closing.pktDateString(new Date());
  const report = await getCustomerAging(membership.shopId, asOf);

  const header = ["Customer", "Phone", "0-30", "31-60", "61-90", "90+", "Total", "Oldest (days)"];
  const rows: CsvRow[] = report.rows.map((r) => [
    r.name,
    r.phone ?? "",
    r.current,
    r.d31_60,
    r.d61_90,
    r.over90,
    r.total,
    r.oldestDays,
  ]);
  rows.push([
    "TOTALS",
    "",
    report.totals.current,
    report.totals.d31_60,
    report.totals.d61_90,
    report.totals.over90,
    report.totals.total,
    "",
  ]);
  return csvResponse(`aging_${asOf}.csv`, toCsv(header, rows));
}
