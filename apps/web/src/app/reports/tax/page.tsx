import { requireShop } from "@/lib/require-shop";
import { formatPKR } from "@shopos/core";
import { ReportShell } from "../report-shell";
import { resolveRange, rangeQuery } from "../date-range";
import { getTaxSummary } from "../queries";

interface Props {
  searchParams?: Promise<{ preset?: string; from?: string; to?: string }>;
}

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

export default async function TaxReportPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const range = resolveRange(sp);
  const { session, membership } = await requireShop();
  const report = await getTaxSummary(membership.shopId, range);

  return (
    <ReportShell
      email={session.email}
      shopName={membership.shopName}
      title="Tax summary"
      subtitle={`${range.from} → ${range.to}`}
      range={range}
      csvHref={`/api/reports/tax.csv?${rangeQuery(range)}`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Sales tax collected" value={formatPKR(report.salesTaxCollected)} accent={report.salesTaxCollected > 0} tone="indigo" />
        <Tile label="Purchase tax paid" value={formatPKR(report.purchaseTaxPaid)} />
        <Tile
          label="Net payable"
          value={formatPKR(report.netPayable)}
          accent={report.netPayable > 0}
          tone="rose"
          note={report.netPayable > 0 ? "Owed to FBR for this period" : "Nothing owed"}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">By tax rate</h2>
        {report.byRate.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3 text-right">Taxable base</th>
                  <th className="px-4 py-3 text-right">Tax amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.byRate.map((r) => (
                  <tr key={r.rate}>
                    <td className="px-4 py-2.5 text-slate-900">{r.rate}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(r.base)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(r.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Daily tax flow</h2>
        {report.byDay.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3 text-right">Sales tax</th>
                  <th className="px-4 py-3 text-right">Purchase tax</th>
                  <th className="px-4 py-3 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.byDay.map((d) => {
                  const net = Math.round((d.salesTax - d.purchaseTax) * 100) / 100;
                  return (
                    <tr key={d.day}>
                      <td className="px-4 py-2.5 text-slate-900">{dayFmt.format(new Date(`${d.day}T00:00:00Z`))}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-indigo-700">{formatPKR(d.salesTax)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-700">{formatPKR(d.purchaseTax)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ReportShell>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      No tax activity in this range.
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  accent,
  tone = "indigo",
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
  tone?: "indigo" | "rose";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-indigo-200 bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${accent ? cls : "border-slate-200 bg-white text-slate-900"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "opacity-80" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {note ? <p className={`mt-1 text-xs ${accent ? "opacity-80" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}
