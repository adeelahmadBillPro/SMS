import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatPKR } from "@shopos/core";
import { listExpenses } from "./queries";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ExpensesPage() {
  const { session, membership } = await requireShop();
  const expenses = await listExpenses(membership.shopId, { limit: 200 });
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const cashTotal = expenses.filter((e) => e.paidViaCash).reduce((a, e) => a + e.amount, 0);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
            <p className="mt-1 text-sm text-slate-600">
              {expenses.length} entries · total {formatPKR(total)} · cash {formatPKR(cashTotal)}
            </p>
          </div>
          <Link href="/expenses/new">
            <Button>Add expense</Button>
          </Link>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">No expenses recorded</p>
            <p className="mt-1 text-sm text-slate-500">
              Rent, utilities, transport, tea — log them here so closing knows where the cash went.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3">Via</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="text-sm hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{dateFmt.format(e.paidAt)}</td>
                    <td className="px-4 py-3 text-slate-900">{e.category}</td>
                    <td className="px-4 py-3 text-slate-600">{e.note ?? <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {e.paidViaCash ? "Cash" : "Bank"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                      {formatPKR(e.amount)}
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
