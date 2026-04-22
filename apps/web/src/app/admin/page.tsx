import { notFound, redirect } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { logoutAction } from "../(auth)/logout/action";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") notFound();

  const [tenants, userCount] = await Promise.all([
    prismaAdmin.shop.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        subscriptions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { plan: { select: { name: true } } },
        },
      },
      take: 50,
    }),
    prismaAdmin.user.count(),
  ]);

  const pkrFmt = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  });
  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">ShopOS</span>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{session.email}</span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Platform admin</h1>
            <p className="mt-1 text-sm text-slate-600">
              {tenants.length} tenant{tenants.length === 1 ? "" : "s"} · {userCount} users
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Members</th>
                  <th className="px-4 py-3">Opening cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No tenants yet. Sign up a test shop from the landing page to see one here.
                    </td>
                  </tr>
                ) : (
                  tenants.map((t) => {
                    const sub = t.subscriptions[0];
                    return (
                      <tr key={t.id} className="text-sm">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-400">{t.id}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{dateFmt.format(t.createdAt)}</td>
                        <td className="px-4 py-3 text-slate-600">{sub?.plan.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {sub ? <StatusPill status={sub.status} /> : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">{t._count.members}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-600">
                          {pkrFmt.format(Number(t.openingCash))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    TRIALING: "bg-indigo-100 text-indigo-800",
    ACTIVE: "bg-slate-900 text-white",
    PAST_DUE: "bg-amber-100 text-amber-900",
    CANCELED: "bg-slate-100 text-slate-700",
    SUSPENDED: "bg-rose-100 text-rose-800",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
