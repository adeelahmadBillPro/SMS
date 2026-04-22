import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listPurchases } from "./queries";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function PurchasesPage() {
  const { session, membership } = await requireShop();
  const purchases = await listPurchases(membership.shopId, {});
  const totalOutstanding = purchases.reduce((a, p) => a + Math.max(0, p.balance), 0);
  const totalSpent = purchases.reduce((a, p) => a + p.total, 0);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Purchases</h1>
            <p className="mt-1 text-sm text-slate-600">
              {purchases.length} purchase{purchases.length === 1 ? "" : "s"} · spent {formatPKR(totalSpent)} · unpaid {formatPKR(totalOutstanding)}
            </p>
          </div>
          <Link href="/purchases/new">
            <Button>Record purchase</Button>
          </Link>
        </div>

        {purchases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No purchases yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Record a purchase to receive stock from a supplier — this also updates your inventory and ledger.
            </p>
            <Link
              href="/purchases/new"
              className="mt-4 inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              Record purchase
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3 text-right">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p.id} className="text-sm hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{dateFmt.format(p.purchasedAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/purchases/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.supplierName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.invoiceNo ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{p.itemCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatPKR(p.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={p.balance > 0 ? "font-medium text-rose-700" : "text-slate-500"}>
                        {formatPKR(Math.max(0, p.balance))}
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
