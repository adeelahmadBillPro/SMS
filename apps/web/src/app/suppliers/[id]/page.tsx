import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { getSupplier } from "../queries";
import { RecordSupplierPaymentForm } from "./record-payment-form";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, membership } = await requireShop();
  const supplier = await getSupplier(membership.shopId, id);
  if (!supplier) notFound();

  const outstandingPositive = Math.max(0, supplier.outstanding);
  const waPhone = supplier.phone?.replace(/[^\d]/g, "") ?? "";
  const waMsg = encodeURIComponent(
    `Assalamualaikum ${supplier.name},\n` +
    `Current balance due to you: ${formatPKR(outstandingPositive)}\n` +
    `— sent from ShopOS`,
  );
  const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : null;

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/suppliers" className="hover:underline">Suppliers</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{supplier.name}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {supplier.phone ? <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a> : null}
              {supplier.phone && supplier.ntn ? " · " : null}
              {supplier.ntn ? <span>NTN {supplier.ntn}</span> : null}
              {supplier.address ? <div className="text-slate-400">{supplier.address}</div> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Message on WhatsApp
              </a>
            ) : null}
            <Link href={`/purchases/new?supplier=${supplier.id}`}>
              <Button variant="secondary">New purchase</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="You owe" value={formatPKR(outstandingPositive)} accent={outstandingPositive > 0} />
          <StatTile label="Opening balance" value={formatPKR(supplier.openingBalance)} />
          <StatTile label="Purchases on record" value={supplier.timeline.filter((e) => e.kind === "PURCHASE").length.toString()} />
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr,20rem]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Ledger (khata)</h2>
            {supplier.timeline.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No activity yet. Record a purchase or payment to start the ledger.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Entry</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplier.timeline.map((e, i) => (
                      <tr key={`${e.kind}-${e.refId ?? i}`} className="align-top">
                        <td className="px-4 py-3 text-slate-500">{dateFmt.format(e.date)}</td>
                        <td className="px-4 py-3 text-slate-900">{e.label}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                          {e.debit > 0 ? formatPKR(e.debit) : ""}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-indigo-700">
                          {e.credit > 0 ? formatPKR(e.credit) : ""}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                          {formatPKR(e.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Record payment</h2>
            <RecordSupplierPaymentForm supplierId={supplier.id} defaultAmount={outstandingPositive} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        accent ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-rose-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${accent ? "text-rose-900" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
