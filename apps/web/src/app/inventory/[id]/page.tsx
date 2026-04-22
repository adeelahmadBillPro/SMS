import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { getProduct } from "../queries";
import { AddVariantForm } from "./add-variant-form";
import { AdjustStockForm } from "./adjust-stock-form";
import { ArchiveButton } from "./archive-button";

const CATEGORY_LABEL: Record<string, string> = {
  MOBILE: "Mobile",
  LAPTOP: "Laptop",
  ACCESSORY: "Accessory",
  CHARGER: "Charger",
  COVER: "Cover",
  SIM: "SIM",
  OTHER: "Other",
};
const REASON_LABEL: Record<string, string> = {
  PURCHASE: "Received",
  OPENING: "Opening balance",
  SALE: "Sold",
  RETURN_IN: "Return in",
  RETURN_OUT: "Return out",
  DAMAGE: "Damaged",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, membership } = await requireShop();
  const product = await getProduct(membership.shopId, id);
  if (!product) notFound();

  const isSerialized = product.hasImei || product.hasSerial;

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/inventory" className="hover:underline">Inventory</Link>
              <span className="mx-1 text-slate-300">/</span>
              <span className="text-slate-500">{CATEGORY_LABEL[product.category] ?? product.category}</span>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{product.name}</h1>
            <div className="mt-1 text-sm text-slate-500">
              <span className="font-mono">{product.sku}</span>
              {product.brand ? <span> · {product.brand}</span> : null}
              {product.model ? <span> · {product.model}</span> : null}
              {!product.isActive ? (
                <span className="ml-2 rounded bg-slate-200 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  Archived
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/inventory/${product.id}/receive`}>
              <Button>Receive stock</Button>
            </Link>
            <ArchiveButton productId={product.id} isActive={product.isActive} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="In stock" value={`${product.currentQty}`} accent={product.isLow && product.isActive} note={product.isLow && product.isActive ? "Below reorder threshold" : "units"} />
          <StatTile label="Unit cost" value={formatPKR(product.cost)} />
          <StatTile label="Unit price" value={formatPKR(product.price)} />
          <StatTile label="Stock value" value={formatPKR(product.currentQty * product.cost)} />
        </div>

        {product.variants.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Variants</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3 text-right">Cost</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">In stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.variants.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 text-slate-900">
                        {[v.color, v.storage, v.ram].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {v.costOverride != null ? formatPKR(v.costOverride) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                        {v.priceOverride != null ? formatPKR(v.priceOverride) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{v.currentQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Add variant</h2>
            <AddVariantForm productId={product.id} />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Adjust stock</h2>
            <AdjustStockForm productId={product.id} />
          </div>
        </section>

        {isSerialized && product.stockItems.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Serialized units in stock ({product.stockItems.length})
            </h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">IMEI</th>
                    <th className="px-4 py-3">Serial</th>
                    <th className="px-4 py-3">Acquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {product.stockItems.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-slate-900">{s.imei ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-900">{s.serial ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{dateFmt.format(s.acquiredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {product.recentMovements.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Recent movements</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {product.recentMovements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-slate-500">{dateFmt.format(m.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-900">{REASON_LABEL[m.reason] ?? m.reason}</td>
                      <td className={`px-4 py-3 text-right tabular-nums ${m.qtyDelta > 0 ? "text-indigo-700" : "text-slate-900"}`}>
                        {m.qtyDelta > 0 ? "+" : ""}{m.qtyDelta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        accent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-amber-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent ? "text-amber-900" : "text-slate-900"}`}>
        {value}
      </p>
      {note ? <p className={`mt-1 text-xs ${accent ? "text-amber-800" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}
