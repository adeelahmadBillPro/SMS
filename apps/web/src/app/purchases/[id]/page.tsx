import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { formatPKR } from "@shopos/core";
import { getPurchase } from "../queries";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash", BANK: "Bank", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", CARD: "Card", CHEQUE: "Cheque", CREDIT: "Credit",
};

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, membership } = await requireShop();
  const purchase = await getPurchase(membership.shopId, id);
  if (!purchase) notFound();

  const paidSum = purchase.payments.reduce((a, p) => a + p.amount, 0);
  const balance = Math.max(0, purchase.total - paidSum);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/purchases" className="hover:underline">Purchases</Link>
              <span className="mx-1 text-slate-300">/</span>
              <Link href={`/suppliers/${purchase.supplierId}`} className="hover:underline">{purchase.supplierName}</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Purchase {purchase.invoiceNo ?? `#${purchase.id.slice(0, 8).toUpperCase()}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{dateFmt.format(purchase.purchasedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Balance</p>
            <p className={`mt-0.5 text-2xl font-semibold tabular-nums ${balance > 0 ? "text-rose-700" : "text-slate-900"}`}>
              {formatPKR(balance)}
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Items</h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchase.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{it.productName}</p>
                      <p className="text-xs text-slate-500 font-mono">{it.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums text-slate-600">{it.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatPKR(it.unitCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatPKR(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 text-sm">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Subtotal</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">{formatPKR(purchase.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Tax</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">{formatPKR(purchase.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right font-medium text-slate-900">Total</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900">{formatPKR(purchase.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Payments</h2>
          {purchase.payments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No payments yet — the full amount is owed to the supplier.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchase.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-slate-500">{dateFmt.format(p.paidAt)}</td>
                      <td className="px-4 py-3 text-slate-900">{METHOD_LABELS[p.method] ?? p.method}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900">{formatPKR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {balance > 0 ? (
            <p className="text-sm text-slate-600">
              Clear the balance by{" "}
              <Link href={`/suppliers/${purchase.supplierId}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                recording a payment on the supplier page
              </Link>
              .
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
