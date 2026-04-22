import Link from "next/link";
import { formatPKR } from "@shopos/core";
import type { ProductListRow } from "./queries";

const CATEGORY_LABEL: Record<string, string> = {
  MOBILE: "Mobile",
  LAPTOP: "Laptop",
  ACCESSORY: "Accessory",
  CHARGER: "Charger",
  COVER: "Cover",
  SIM: "SIM",
  OTHER: "Other",
};

export function ProductsTable({ rows }: { rows: ProductListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-900">No products yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Add your first product, then receive stock to start ringing up sales.
        </p>
        <Link
          href="/inventory/new"
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add product
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">In stock</th>
            <th className="px-4 py-3 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((p) => (
            <tr key={p.id} className="text-sm hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/inventory/${p.id}`} className="block">
                  <div className="font-medium text-slate-900">
                    {p.name}
                    {!p.isActive ? (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        Archived
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <span className="font-mono">{p.sku}</span>
                    {p.brand ? <span> · {p.brand}</span> : null}
                    {p.model ? <span> · {p.model}</span> : null}
                    {p.hasImei ? <span> · IMEI</span> : null}
                    {p.hasSerial ? <span> · Serial</span> : null}
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{CATEGORY_LABEL[p.category] ?? p.category}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatPKR(p.price)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span
                  className={
                    p.isLow && p.isActive
                      ? "inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-medium text-amber-900"
                      : "text-slate-900"
                  }
                >
                  {p.currentQty}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                {formatPKR(p.currentQty * p.cost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
