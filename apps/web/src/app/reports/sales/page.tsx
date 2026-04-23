import { requireShop } from "@/lib/require-shop";
import { formatPKR } from "@shopos/core";
import { ReportShell } from "../report-shell";
import { resolveRange, rangeQuery } from "../date-range";
import { getSalesReport } from "../queries";

interface Props {
  searchParams?: Promise<{ preset?: string; from?: string; to?: string }>;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

export default async function SalesReportPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const range = resolveRange(sp);
  const { session, membership } = await requireShop();
  const report = await getSalesReport(membership.shopId, range);

  return (
    <ReportShell
      email={session.email}
      shopName={membership.shopName}
      title="Sales report"
      subtitle={`${range.from} → ${range.to}`}
      range={range}
      csvHref={`/api/reports/sales.csv?${rangeQuery(range)}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Bills" value={report.totals.bills.toLocaleString("en-PK")} />
        <Tile label="Gross revenue" value={formatPKR(report.totals.grossRevenue)} />
        <Tile label="Net revenue" value={formatPKR(report.totals.netRevenue)} note="ex-tax" />
        <Tile label="Gross profit" value={formatPKR(report.totals.grossProfit)} accent={report.totals.grossProfit > 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Tax collected" value={formatPKR(report.totals.tax)} />
        <Tile label="Discount given" value={formatPKR(report.totals.discount)} />
        <Tile label="COGS" value={formatPKR(report.totals.cogs)} />
        <Tile label="Credit sales" value={formatPKR(report.totals.creditSales)} />
      </div>

      <Panel title="Day by day">
        {report.byDay.length === 0 ? (
          <EmptyRow />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3 text-right">Bills</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">COGS</th>
                <th className="px-4 py-3 text-right">Gross profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.byDay.map((d) => {
                const gp = Math.round((d.total - d.tax - d.cogs) * 100) / 100;
                return (
                  <tr key={d.day}>
                    <td className="px-4 py-2.5 text-slate-900">{dayFmt.format(new Date(`${d.day}T00:00:00Z`))}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{d.bills}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(d.total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(d.tax)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(d.cogs)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700">{formatPKR(gp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Sales by payment method">
          {report.byMethod.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {report.byMethod.map((m) => (
                  <tr key={m.method}>
                    <td className="px-4 py-2.5 text-slate-900">{m.method}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="By category">
          {report.byCategory.length === 0 ? (
            <EmptyRow />
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="px-4 py-2.5 text-slate-900">{c.category}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{c.qty}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel title="Top products (up to 20)">
        {report.topProducts.length === 0 ? (
          <EmptyRow />
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.topProducts.map((p) => (
                <tr key={p.productId}>
                  <td className="px-4 py-2.5 text-slate-900">{p.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.sku}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{p.qty}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </ReportShell>
  );
}

function Tile({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: boolean }) {
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
      {note ? <p className={`mt-1 text-xs ${accent ? "text-indigo-800" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">{children}</div>
    </section>
  );
}

function EmptyRow() {
  return <div className="p-6 text-center text-sm text-slate-500">No data in this range.</div>;
}
