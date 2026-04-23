import { requireShop } from "@/lib/require-shop";
import { formatPKR } from "@shopos/core";
import { ReportShell } from "../report-shell";
import { getStockValuation } from "../queries";

const CATEGORY_LABEL: Record<string, string> = {
  MOBILE: "Mobile",
  LAPTOP: "Laptop",
  ACCESSORY: "Accessory",
  CHARGER: "Charger",
  COVER: "Cover",
  SIM: "SIM",
  OTHER: "Other",
};

export default async function StockValuationPage() {
  const { session, membership } = await requireShop();
  const report = await getStockValuation(membership.shopId);

  return (
    <ReportShell
      email={session.email}
      shopName={membership.shopName}
      title="Stock valuation"
      subtitle="Snapshot at request time — current stock × unit cost / price."
      csvHref={`/api/reports/stock.csv`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Units in stock" value={report.totals.qty.toLocaleString("en-PK")} />
        <Tile label="Cost value" value={formatPKR(report.totals.costValue)} />
        <Tile label="Retail value" value={formatPKR(report.totals.retailValue)} />
        <Tile
          label="Potential profit"
          value={formatPKR(report.totals.potentialProfit)}
          accent={report.totals.potentialProfit > 0}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Line items</h2>
        {report.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Nothing in stock.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3 text-right">Unit price</th>
                  <th className="px-4 py-3 text-right">Cost value</th>
                  <th className="px-4 py-3 text-right">Retail value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r) => (
                  <tr key={r.productId}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{r.name}</div>
                      <div className="font-mono text-xs text-slate-500">{r.sku}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{r.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(r.unitCost)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(r.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(r.costValue)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(r.retailValue)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm font-medium">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 text-right text-slate-700">Totals</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{report.totals.qty}</td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">
                    {formatPKR(report.totals.costValue)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">
                    {formatPKR(report.totals.retailValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </ReportShell>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-indigo-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${accent ? "text-indigo-900" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
