import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { countLowStock, listProducts } from "@/app/inventory/queries";
import { formatPKR } from "@shopos/core";

export default async function DashboardPage() {
  const { session, membership } = await requireShop();

  const [products, lowCount] = await Promise.all([
    listProducts(membership.shopId, {}),
    countLowStock(membership.shopId),
  ]);

  const activeProducts = products.filter((p) => p.isActive);
  const totalUnits = activeProducts.reduce((a, p) => a + Math.max(0, p.currentQty), 0);
  const stockValue = activeProducts.reduce((a, p) => a + p.currentQty * p.cost, 0);
  const lowItems = activeProducts.filter((p) => p.isLow).slice(0, 6);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Your shop at a glance.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Products" value={activeProducts.length.toLocaleString("en-PK")} href="/inventory" />
          <StatCard title="Units in stock" value={totalUnits.toLocaleString("en-PK")} />
          <StatCard title="Stock value" value={formatPKR(stockValue)} />
          <StatCard
            title="Needs reorder"
            value={lowCount.toLocaleString("en-PK")}
            accent={lowCount > 0}
            href={lowCount > 0 ? "/inventory?low=1" : undefined}
          />
        </div>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Low stock</h2>
              {lowCount > 0 ? (
                <Link href="/inventory?low=1" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                  View all →
                </Link>
              ) : null}
            </div>
            {lowItems.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Nothing below threshold. Nice.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100">
                  {lowItems.map((p) => (
                    <li key={p.id}>
                      <Link href={`/inventory/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{p.sku}</span>
                            {p.brand ? <span> · {p.brand}</span> : null}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums text-sm font-medium text-amber-900">
                            {p.currentQty} left
                          </p>
                          <p className="text-xs text-slate-500">alert at {p.lowStockThreshold}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Get started</h2>
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
              <p className="font-medium">You&apos;re on the 14-day free trial.</p>
              <p className="mt-1 text-indigo-800">
                Add a product, receive stock, then ring up a sale. We&apos;ll walk you through closing on day one.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/inventory/new"
                  className="inline-flex h-9 items-center rounded-md bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Add product
                </Link>
                <Link
                  href="/inventory"
                  className="inline-flex h-9 items-center rounded-md bg-white px-3 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  See inventory
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  title,
  value,
  accent,
  href,
}: {
  title: string;
  value: string;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <div
      className={`rounded-lg border p-5 shadow-sm transition-colors ${
        accent ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-amber-800" : "text-slate-500"
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums ${
          accent ? "text-amber-900" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
