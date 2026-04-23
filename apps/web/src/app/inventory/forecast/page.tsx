import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listLatestForecasts, forecastExists } from "@/app/forecasting/queries";
import { RecomputeButton } from "./recompute-button";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  searchParams?: Promise<{ filter?: string }>;
}

export default async function ForecastPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const filter = sp.filter === "dead" ? "dead" : sp.filter === "all" ? "all" : "reorder";
  const { session, membership } = await requireShop();

  const [rows, exists] = await Promise.all([
    listLatestForecasts(membership.shopId, {
      onlyReorder: filter === "reorder",
      onlyDeadStock: filter === "dead",
      limit: 300,
    }),
    forecastExists(membership.shopId),
  ]);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/inventory" className="hover:underline">Inventory</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Forecast</h1>
            <p className="mt-1 text-sm text-slate-600">
              7-day and 30-day rolling sales per product. Reorder triggers when current stock drops below
              lead-time demand plus a 2-day buffer.
            </p>
          </div>
          <RecomputeButton />
        </div>

        {!exists ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No forecast yet</p>
            <p className="mt-1 text-sm text-slate-500">
              The nightly job will run after the next closing. Or click <strong>Recompute now</strong>.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(["reorder", "dead", "all"] as const).map((k) => {
                const label = k === "reorder" ? "Needs reorder" : k === "dead" ? "Dead stock" : "All products";
                const active = filter === k;
                return (
                  <Link
                    key={k}
                    href={`/inventory/forecast?filter=${k}`}
                    className={`h-8 rounded-md px-3 text-xs font-medium flex items-center transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                {filter === "reorder"
                  ? "Nothing needs reordering. Nice."
                  : filter === "dead"
                    ? "No dead stock. Everything moves."
                    : "No products."}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">In stock</th>
                      <th className="px-4 py-3 text-right">Avg/day (7d)</th>
                      <th className="px-4 py-3 text-right">Avg/day (30d)</th>
                      <th className="px-4 py-3 text-right">Days left</th>
                      <th className="px-4 py-3 text-right">Reorder @</th>
                      <th className="px-4 py-3 text-right">Order qty</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <Link href={`/inventory/${r.productId}`} className="block">
                            <div className="font-medium text-slate-900 hover:underline">{r.name}</div>
                            <div className="text-xs text-slate-500">
                              <span className="font-mono">{r.sku}</span>
                              {r.brand ? <span> · {r.brand}</span> : null}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{r.currentStock}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.avgDailySales7d}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.avgDailySales30d}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span
                            className={
                              r.daysOfStockRemaining < 7
                                ? "font-medium text-rose-700"
                                : r.daysOfStockRemaining < 14
                                  ? "font-medium text-amber-800"
                                  : "text-slate-600"
                            }
                          >
                            {r.daysOfStockRemaining > 999 ? "∞" : r.daysOfStockRemaining}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{r.reorderPoint}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-indigo-700">
                          {r.reorderSuggested ? r.suggestedReorderQty : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.reorderSuggested ? (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                              Reorder
                            </span>
                          ) : r.isDeadStock ? (
                            <span className="inline-flex items-center rounded-md bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                              Dead stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-800">
                              OK
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows[0] ? (
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                    Last snapshot {dateFmt.format(rows[0].snapshotDate)}
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
