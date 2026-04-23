import Link from "next/link";
import { redirect } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Closing, formatPKR } from "@shopos/core";
import { getClosingByDate, getDaySnapshot, listClosings } from "./queries";
import { CloseDayForm } from "./close-day-form";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

interface Props {
  searchParams?: Promise<{ day?: string }>;
}

export default async function ClosingPage({ searchParams }: Props) {
  const { session, membership } = await requireShop();
  const sp = (await searchParams) ?? {};
  const today = Closing.pktDateString(new Date());
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : today;

  const existing = await getClosingByDate(membership.shopId, day);
  if (existing && !existing.reversed) {
    redirect(`/closing/${day}`);
  }

  const [snap, previousClosings] = await Promise.all([
    getDaySnapshot(membership.shopId, day),
    listClosings(membership.shopId, 20),
  ]);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Close the day</h1>
            <p className="mt-1 text-sm text-slate-600">
              {day === today ? "Today" : dateFmt.format(new Date(`${day}T00:00:00Z`))} ·{" "}
              opening cash {formatPKR(snap.openingCash)}
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">← Back</Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr,22rem]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Expected cash — SPEC §7
                </h2>
              </div>
              <dl className="divide-y divide-slate-100 text-sm">
                <CashRow label="Opening cash" amount={snap.openingCash} />
                <CashRow label="+ Cash sales" amount={snap.expected.cashSales} plus />
                <CashRow label="+ Customers paid on account" amount={snap.expected.cashOnAccountFromCustomers} plus />
                <CashRow label="− Cash paid at purchase" amount={snap.expected.cashPaidOnPurchase} minus />
                <CashRow label="− Paid to suppliers (on account)" amount={snap.expected.cashOnAccountToSuppliers} minus />
                <CashRow label="− Expenses in cash" amount={snap.expected.cashExpenses} minus />
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 text-base">
                  <dt className="font-medium text-slate-900">Expected in drawer</dt>
                  <dd className="tabular-nums text-xl font-semibold text-slate-900">
                    {formatPKR(snap.expected.expectedCash)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Bills rung" value={snap.sales.count.toLocaleString("en-PK")} />
              <StatTile label="Sales total" value={formatPKR(snap.sales.total)} />
              <StatTile label="Gross profit" value={formatPKR(snap.sales.grossProfit)} accent={snap.sales.grossProfit > 0} />
            </div>

            {snap.sales.byMethod.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Payment breakdown</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {snap.sales.byMethod.map((m) => (
                    <span
                      key={m.method}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium text-slate-700">{m.method}</span>
                      <span className="tabular-nums text-slate-900">{formatPKR(m.amount)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {snap.sales.topSellers.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    Top sellers today
                  </h2>
                </div>
                <ul className="divide-y divide-slate-100 text-sm">
                  {snap.sales.topSellers.map((t) => (
                    <li key={t.productId} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-500">{t.qty} unit{t.qty === 1 ? "" : "s"}</p>
                      </div>
                      <p className="tabular-nums text-slate-900">{formatPKR(t.revenue)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <CloseDayForm day={day} expectedCash={snap.expected.expectedCash} />
            {previousClosings.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Previous closings</p>
                <ul className="space-y-1.5">
                  {previousClosings.slice(0, 10).map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/closing/${c.closingDate}`}
                        className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-slate-50"
                      >
                        <span className="text-slate-900">{c.closingDate}</span>
                        <span
                          className={`tabular-nums ${
                            c.variance === 0
                              ? "text-slate-500"
                              : c.variance < 0
                                ? "text-rose-700"
                                : "text-indigo-700"
                          }`}
                        >
                          {c.variance > 0 ? "+" : ""}{formatPKR(c.variance)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function CashRow({ label, amount, plus, minus }: { label: string; amount: number; plus?: boolean; minus?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className="text-slate-600">{label}</dt>
      <dd
        className={`tabular-nums ${
          plus ? "text-indigo-700" : minus ? "text-rose-700" : "text-slate-900"
        }`}
      >
        {formatPKR(amount)}
      </dd>
    </div>
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
      className={`rounded-lg border p-4 ${
        accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-indigo-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${accent ? "text-indigo-900" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}
