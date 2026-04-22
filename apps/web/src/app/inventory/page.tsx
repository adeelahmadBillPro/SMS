import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listProducts } from "./queries";
import { ProductsTable } from "./products-table";

interface PageProps {
  searchParams?: Promise<{ q?: string; low?: string }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const { session, membership } = await requireShop();
  const sp = (await searchParams) ?? {};
  const search = sp.q?.trim();
  const lowStockOnly = sp.low === "1";

  const products = await listProducts(membership.shopId, { search, lowStockOnly });

  const totalValue = products.reduce((acc, p) => acc + p.currentQty * p.cost, 0);
  const lowCount = products.filter((p) => p.isLow && p.isActive).length;
  const totalUnits = products.reduce((acc, p) => acc + Math.max(0, p.currentQty), 0);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Inventory</h1>
            <p className="mt-1 text-sm text-slate-600">
              {products.length} product{products.length === 1 ? "" : "s"} · {totalUnits} unit{totalUnits === 1 ? "" : "s"} in stock · stock value {formatPKR(totalValue)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/inventory/new">
              <Button>Add product</Button>
            </Link>
          </div>
        </div>

        <Filters initialSearch={search ?? ""} lowStockOnly={lowStockOnly} lowCount={lowCount} />

        <ProductsTable rows={products} />
      </div>
    </AppShell>
  );
}

function Filters({
  initialSearch,
  lowStockOnly,
  lowCount,
}: {
  initialSearch: string;
  lowStockOnly: boolean;
  lowCount: number;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2" action="/inventory" method="get">
      <input
        type="search"
        name="q"
        defaultValue={initialSearch}
        placeholder="Search name, SKU, barcode…"
        className="h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      />
      {lowStockOnly ? <input type="hidden" name="low" value="1" /> : null}
      <Button type="submit" variant="secondary" size="sm">Search</Button>
      <Link
        href={lowStockOnly ? "/inventory" : "/inventory?low=1"}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
          lowStockOnly
            ? "bg-amber-100 text-amber-900 hover:bg-amber-200"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        {lowStockOnly ? "Showing low-stock" : `Low stock (${lowCount})`}
      </Link>
    </form>
  );
}
