import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listCustomers } from "./queries";

interface Props {
  searchParams?: Promise<{ q?: string }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const { session, membership } = await requireShop();
  const sp = (await searchParams) ?? {};
  const search = sp.q?.trim();
  const customers = await listCustomers(membership.shopId, { search });
  const outstandingTotal = customers.reduce((a, c) => a + c.outstanding, 0);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
            <p className="mt-1 text-sm text-slate-600">
              {customers.length} customer{customers.length === 1 ? "" : "s"} · total receivables {formatPKR(outstandingTotal)}
            </p>
          </div>
          <Link href="/customers/new">
            <Button>Add customer</Button>
          </Link>
        </div>

        <form className="flex items-center gap-2" action="/customers" method="get">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ""}
            placeholder="Search name, phone, CNIC…"
            className="h-10 w-full max-w-sm rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        {customers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No customers yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Walk-in sales need no customer. Add one when you want to track credit or send receipts over WhatsApp.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-right">Credit limit</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="text-sm hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      {c.cnic ? <div className="text-xs text-slate-500">{c.cnic}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                      {formatPKR(c.creditLimit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={c.outstanding > 0 ? "font-medium text-rose-700" : "text-slate-900"}>
                        {formatPKR(c.outstanding)}
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
