import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listSuppliers } from "./queries";

interface Props {
  searchParams?: Promise<{ q?: string }>;
}

export default async function SuppliersPage({ searchParams }: Props) {
  const { session, membership } = await requireShop();
  const sp = (await searchParams) ?? {};
  const search = sp.q?.trim();
  const suppliers = await listSuppliers(membership.shopId, { search });
  const totalOutstanding = suppliers.reduce((a, s) => a + Math.max(0, s.outstanding), 0);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Suppliers</h1>
            <p className="mt-1 text-sm text-slate-600">
              {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} · total dues {formatPKR(totalOutstanding)}
            </p>
          </div>
          <Link href="/suppliers/new">
            <Button>Add supplier</Button>
          </Link>
        </div>

        <form className="flex items-center gap-2" action="/suppliers" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search name, phone, NTN…"
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        {suppliers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No suppliers yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add suppliers to record purchases and track what you owe.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">NTN</th>
                  <th className="px-4 py-3 text-right">You owe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="text-sm hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/suppliers/${s.id}`} className="block">
                        <div className="font-medium text-slate-900">{s.name}</div>
                        {s.address ? <div className="text-xs text-slate-500">{s.address}</div> : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.phone ? <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.ntn ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={s.outstanding > 0 ? "font-medium text-rose-700" : "text-slate-500"}>
                        {formatPKR(Math.max(0, s.outstanding))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
