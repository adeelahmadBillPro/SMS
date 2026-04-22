import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { getCustomer } from "../queries";
import { RecordCustomerPaymentForm } from "./record-payment-form";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, membership } = await requireShop();
  const customer = await getCustomer(membership.shopId, id);
  if (!customer) notFound();

  const outstandingPositive = Math.max(0, customer.outstanding);
  const withinLimit = outstandingPositive <= customer.creditLimit;

  const waPhone = customer.phone?.replace(/[^\d]/g, "") ?? "";
  const waMsg = encodeURIComponent(
    `Assalamualaikum ${customer.name},\n` +
    `Baqaya raqam: ${formatPKR(outstandingPositive)}.\n` +
    `Ap apna payment jald az jald clear karain. Shukriya.`,
  );
  const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : null;

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/customers" className="hover:underline">Customers</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{customer.name}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {customer.phone ? <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a> : null}
              {customer.phone && customer.cnic ? " · " : null}
              {customer.cnic ? <span>CNIC {customer.cnic}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waLink && outstandingPositive > 0 ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Remind on WhatsApp
              </a>
            ) : null}
            <Link href={`/pos?customer=${customer.id}`}>
              <Button variant="secondary">New sale</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Customer owes"
            value={formatPKR(outstandingPositive)}
            accent={outstandingPositive > 0}
          />
          <StatTile label="Credit limit" value={formatPKR(customer.creditLimit)} />
          <StatTile
            label="Available credit"
            value={formatPKR(Math.max(0, customer.creditLimit - outstandingPositive))}
            accent={!withinLimit}
            note={withinLimit ? undefined : "Over limit"}
          />
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr,20rem]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Ledger (khata)</h2>
            {customer.timeline.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No credit transactions yet. When this customer buys on credit or pays on account, it appears here.
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
                    {customer.timeline.map((e, i) => (
                      <tr key={`${e.kind}-${e.refId ?? i}`}>
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Receive payment</h2>
            <RecordCustomerPaymentForm customerId={customer.id} defaultAmount={outstandingPositive} />
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
  note,
}: {
  label: string;
  value: string;
  accent?: boolean;
  note?: string;
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
      {note ? <p className={`mt-1 text-xs ${accent ? "text-rose-800" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}
