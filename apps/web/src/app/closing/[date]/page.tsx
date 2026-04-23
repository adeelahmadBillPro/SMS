import Link from "next/link";
import { notFound } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { requireShop } from "@/lib/require-shop";
import { formatPKR } from "@shopos/core";
import { getClosingByDate, getDaySnapshot } from "../queries";
import { PrintButton } from "./print-button";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ClosingDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const { session, membership } = await requireShop();

  const [closing, snap, shop] = await Promise.all([
    getClosingByDate(membership.shopId, date),
    getDaySnapshot(membership.shopId, date),
    prismaAdmin.shop.findUniqueOrThrow({
      where: { id: membership.shopId },
      select: { name: true, address: true },
    }),
  ]);

  if (!closing) notFound();

  return (
    <div className="min-h-dvh bg-slate-50 print:bg-white">
      <AppShellHeader
        email={session.email}
        shopName={membership.shopName}
        closing={closing.closingDate}
      />
      <main className="mx-auto max-w-4xl px-6 py-8 print:py-0">
        <article className="space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none print:p-0">
          <header className="text-center border-b border-slate-200 pb-6">
            <h1 className="text-xl font-semibold text-slate-900">{shop.name}</h1>
            {shop.address ? <p className="mt-0.5 text-xs text-slate-500">{shop.address}</p> : null}
            <p className="mt-3 text-sm font-medium uppercase tracking-wider text-slate-500">
              Daily Closing Report
            </p>
            <p className="text-lg font-semibold text-slate-900">{dateFmt.format(new Date(`${closing.closingDate}T00:00:00Z`))}</p>
            <p className="mt-1 text-xs text-slate-400">Closed {dtFmt.format(closing.closedAt)}</p>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            <Summary
              label="Expected"
              value={formatPKR(closing.expectedCash)}
            />
            <Summary label="Actual" value={formatPKR(closing.actualCash)} />
            <Summary
              label="Variance"
              value={`${closing.variance > 0 ? "+" : ""}${formatPKR(closing.variance)}`}
              accent={closing.variance !== 0}
              accentTone={closing.variance < 0 ? "rose" : "indigo"}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Cash flow
            </h2>
            <dl className="overflow-hidden rounded-lg border border-slate-200 text-sm">
              <CashLine label="Opening cash" value={formatPKR(closing.openingCash)} />
              <CashLine label="+ Cash sales" value={formatPKR(snap.expected.cashSales)} tone="plus" />
              <CashLine label="+ Customers paid on account" value={formatPKR(snap.expected.cashOnAccountFromCustomers)} tone="plus" />
              <CashLine label="− Cash paid at purchase" value={formatPKR(snap.expected.cashPaidOnPurchase)} tone="minus" />
              <CashLine label="− Paid to suppliers (on account)" value={formatPKR(snap.expected.cashOnAccountToSuppliers)} tone="minus" />
              <CashLine label="− Expenses in cash" value={formatPKR(snap.expected.cashExpenses)} tone="minus" />
              <CashLine label="Expected in drawer" value={formatPKR(closing.expectedCash)} emphasis />
              <CashLine label="Actual cash counted" value={formatPKR(closing.actualCash)} emphasis />
            </dl>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Panel title="Sales">
              <PanelLine label="Bills" value={snap.sales.count.toString()} />
              <PanelLine label="Sales total" value={formatPKR(snap.sales.total)} />
              <PanelLine label="Gross profit" value={formatPKR(snap.sales.grossProfit)} />
            </Panel>
            <Panel title="Purchases + Expenses">
              <PanelLine label="Purchases" value={`${snap.purchases.count} · ${formatPKR(snap.purchases.total)}`} />
              <PanelLine label="Expenses" value={formatPKR(snap.expenses.total)} />
            </Panel>
          </section>

          {snap.sales.byMethod.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Sales by payment method
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {snap.sales.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
                    <span className="font-medium text-slate-700">{m.method}</span>
                    <span className="tabular-nums text-slate-900">{formatPKR(m.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {snap.sales.topSellers.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Top sellers</h2>
              <ol className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 text-sm">
                {snap.sales.topSellers.map((t, i) => (
                  <li key={t.productId} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-slate-900">
                      <span className="inline-block w-5 text-slate-400 tabular-nums">{i + 1}.</span>
                      {t.name}
                    </span>
                    <span className="tabular-nums text-slate-600">
                      {t.qty} · {formatPKR(t.revenue)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {snap.expenses.byCategory.length > 0 ? (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Expenses by category</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {snap.expenses.byCategory.map((c) => (
                  <li key={c.category} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
                    <span className="font-medium text-slate-700">{c.category}</span>
                    <span className="tabular-nums text-slate-900">{formatPKR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Cash + bank at close</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-slate-700">Cash in hand</span>
              <span className="tabular-nums font-medium text-slate-900">{formatPKR(snap.cashInHand)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-slate-700">Bank balance</span>
              <span className="tabular-nums font-medium text-slate-900">{formatPKR(snap.bankBalance)}</span>
            </div>
          </section>
        </article>
      </main>
    </div>
  );
}

function AppShellHeader({
  email,
  shopName,
  closing,
}: {
  email: string;
  shopName: string;
  closing: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/closing" className="text-sm text-slate-500 hover:text-slate-900">← All closings</Link>
          <span className="text-slate-300">·</span>
          <span className="text-sm text-slate-600">{shopName}</span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-xs text-slate-500">{email}</span>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-indigo-800">
            Closed {closing}
          </span>
        </div>
      </div>
    </header>
  );
}

function Summary({
  label,
  value,
  accent,
  accentTone = "indigo",
}: {
  label: string;
  value: string;
  accent?: boolean;
  accentTone?: "rose" | "indigo";
}) {
  const tone =
    accentTone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-indigo-200 bg-indigo-50 text-indigo-900";
  return (
    <div className={`rounded-lg border p-4 ${accent ? tone : "border-slate-200 bg-white text-slate-900"}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CashLine({
  label,
  value,
  tone,
  emphasis,
}: {
  label: string;
  value: string;
  tone?: "plus" | "minus";
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 ${
        emphasis ? "bg-slate-50 font-medium text-slate-900" : ""
      }`}
    >
      <span className={emphasis ? "text-slate-900" : "text-slate-600"}>{label}</span>
      <span
        className={`tabular-nums ${
          tone === "plus" ? "text-indigo-700" : tone === "minus" ? "text-rose-700" : "text-slate-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
      <dl className="mt-2 space-y-1 text-sm">{children}</dl>
    </div>
  );
}

function PanelLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
