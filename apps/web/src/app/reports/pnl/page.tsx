import { requireShop } from "@/lib/require-shop";
import { formatPKR } from "@shopos/core";
import { ReportShell } from "../report-shell";
import { resolveRange, rangeQuery } from "../date-range";
import { getPnl } from "../queries";

interface Props {
  searchParams?: Promise<{ preset?: string; from?: string; to?: string }>;
}

export default async function PnlReportPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const range = resolveRange(sp);
  const { session, membership } = await requireShop();
  const pnl = await getPnl(membership.shopId, range);

  return (
    <ReportShell
      email={session.email}
      shopName={membership.shopName}
      title="Profit & Loss"
      subtitle={`${range.from} → ${range.to}`}
      range={range}
      csvHref={`/api/reports/pnl.csv?${rangeQuery(range)}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Revenue (ex-tax)" value={formatPKR(pnl.revenueExTax)} />
        <Tile label="COGS" value={formatPKR(pnl.cogs)} />
        <Tile label="Gross profit" value={formatPKR(pnl.grossProfit)} accent={pnl.grossProfit > 0} />
        <Tile
          label="Net profit"
          value={formatPKR(pnl.netProfit)}
          accent={pnl.netProfit !== 0}
          accentTone={pnl.netProfit < 0 ? "rose" : "indigo"}
          note={`${pnl.marginPct.toFixed(1)}% margin`}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Calculation</h2>
        <dl className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <Row label="Revenue (ex-tax)" value={formatPKR(pnl.revenueExTax)} />
          <Row label="− COGS" value={`- ${formatPKR(pnl.cogs)}`} tone="minus" />
          <Row label="Gross profit" value={formatPKR(pnl.grossProfit)} emphasis />
          <Row label="− Operating expenses" value={`- ${formatPKR(pnl.expenses)}`} tone="minus" />
          <Row label="Net profit" value={formatPKR(pnl.netProfit)} emphasis />
          <Row label="Tax collected (held for FBR)" value={formatPKR(pnl.taxCollected)} />
        </dl>
      </section>

      {pnl.expensesByCategory.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Expenses by category</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <tbody className="divide-y divide-slate-100">
                {pnl.expensesByCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="px-4 py-2.5 text-slate-900">{c.category}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{formatPKR(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </ReportShell>
  );
}

function Tile({
  label,
  value,
  note,
  accent,
  accentTone = "indigo",
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
  accentTone?: "indigo" | "rose";
}) {
  const tone =
    accentTone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-indigo-200 bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${accent ? tone : "border-slate-200 bg-white text-slate-900"}`}>
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "opacity-80" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
      {note ? <p className={`mt-1 text-xs ${accent ? "opacity-80" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone?: "minus";
  emphasis?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${emphasis ? "bg-slate-50 font-medium" : ""}`}>
      <span className={emphasis ? "text-slate-900" : "text-slate-600"}>{label}</span>
      <span
        className={`tabular-nums ${tone === "minus" ? "text-rose-700" : emphasis ? "text-slate-900" : "text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
