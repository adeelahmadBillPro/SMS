import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { Closing, formatPKR } from "@shopos/core";
import { ReportShell } from "../report-shell";
import { getCustomerAging } from "../queries";

export default async function AgingReportPage() {
  const { session, membership } = await requireShop();
  const asOf = Closing.pktDateString(new Date());
  const report = await getCustomerAging(membership.shopId, asOf);

  return (
    <ReportShell
      email={session.email}
      shopName={membership.shopName}
      title="Customer aging"
      subtitle={`As of ${asOf} (Asia/Karachi)`}
      csvHref={`/api/reports/aging.csv`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="Total outstanding" value={formatPKR(report.totals.total)} />
        <Tile label="0–30 days" value={formatPKR(report.totals.current)} />
        <Tile label="31–60" value={formatPKR(report.totals.d31_60)} accent={report.totals.d31_60 > 0} tone="amber" />
        <Tile label="61–90" value={formatPKR(report.totals.d61_90)} accent={report.totals.d61_90 > 0} tone="amber" />
        <Tile label="90+ days" value={formatPKR(report.totals.over90)} accent={report.totals.over90 > 0} tone="rose" />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Customers ({report.rows.length})
        </h2>
        {report.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No customers with outstanding balance.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">0–30</th>
                  <th className="px-4 py-3 text-right">31–60</th>
                  <th className="px-4 py-3 text-right">61–90</th>
                  <th className="px-4 py-3 text-right">90+</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Oldest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r) => (
                  <tr key={r.customerId}>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/customers/${r.customerId}`}
                        className="block font-medium text-slate-900 hover:underline"
                      >
                        {r.name}
                      </Link>
                      {r.phone ? <div className="text-xs text-slate-500">{r.phone}</div> : null}
                    </td>
                    <Cell value={r.current} />
                    <Cell value={r.d31_60} accent={r.d31_60 > 0 ? "amber" : undefined} />
                    <Cell value={r.d61_90} accent={r.d61_90 > 0 ? "amber" : undefined} />
                    <Cell value={r.over90} accent={r.over90 > 0 ? "rose" : undefined} />
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">
                      {formatPKR(r.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {r.oldestDays}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </ReportShell>
  );
}

function Cell({ value, accent }: { value: number; accent?: "amber" | "rose" }) {
  const color =
    accent === "rose" && value > 0
      ? "text-rose-700 font-medium"
      : accent === "amber" && value > 0
        ? "text-amber-800 font-medium"
        : "text-slate-600";
  return (
    <td className={`px-4 py-2.5 text-right tabular-nums ${color}`}>
      {value > 0 ? formatPKR(value) : <span className="text-slate-300">—</span>}
    </td>
  );
}

function Tile({
  label,
  value,
  accent,
  tone = "indigo",
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "indigo" | "amber" | "rose";
}) {
  const cls =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-indigo-200 bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${accent ? cls : "border-slate-200 bg-white text-slate-900"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "opacity-80" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
