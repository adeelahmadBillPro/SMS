import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prismaAdmin, withShopAsAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { formatPKR } from "@shopos/core";
import { TenantActions } from "./tenant-actions";

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

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") notFound();

  const shop = await prismaAdmin.shop.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { plan: { select: { name: true, code: true } } },
      },
    },
  });
  if (!shop) notFound();

  const currentSub = shop.subscriptions[0];

  // Read tenant activity via admin-bypass so super-admin can see the shop
  // without needing a membership. Every row read here would also surface in
  // audit_log if we chose to log reads; for M11 we only log writes.
  const [salesCount, productsCount, recentSales, recentAudit] = await Promise.all([
    withShopAsAdmin(shop.id, (tx) => tx.sale.count()),
    withShopAsAdmin(shop.id, (tx) => tx.product.count({ where: { isActive: true } })),
    withShopAsAdmin(shop.id, (tx) =>
      tx.sale.findMany({
        orderBy: { soldAt: "desc" },
        take: 10,
        select: { id: true, soldAt: true, total: true, creditAmount: true },
      }),
    ),
    prismaAdmin.auditLog.findMany({
      where: { OR: [{ shopId: shop.id }, { impersonatedShopId: shop.id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const trialDaysLeft = shop.trialEndsAt
    ? Math.ceil((shop.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <AppShell email={session.email} adminBadge hideNav>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/admin" className="hover:underline">Platform admin</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{shop.name}</h1>
            <p className="mt-1 font-mono text-xs text-slate-400">{shop.id}</p>
          </div>
          <StatusPill status={shop.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Signed up" value={dateFmt.format(shop.createdAt)} />
          <Tile
            label="Plan"
            value={currentSub?.plan.name ?? "—"}
            note={currentSub?.status ?? ""}
          />
          <Tile
            label="Trial ends"
            value={shop.trialEndsAt ? dateFmt.format(shop.trialEndsAt) : "—"}
            note={trialDaysLeft != null ? (trialDaysLeft > 0 ? `${trialDaysLeft}d left` : `${Math.abs(trialDaysLeft)}d overdue`) : undefined}
            accent={trialDaysLeft != null && trialDaysLeft < 3}
          />
          <Tile label="Sales on record" value={salesCount.toLocaleString("en-PK")} note={`${productsCount} active products`} />
        </div>

        <TenantActions
          shopId={shop.id}
          status={shop.status}
          currentTrialEnd={shop.trialEndsAt ? shop.trialEndsAt.toISOString() : null}
        />

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Members</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shop.members.map((m) => (
                    <tr key={`${m.userId}-${m.shopId}`}>
                      <td className="px-4 py-2.5 text-slate-900">{m.user.email}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{dateFmt.format(m.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Recent sales</h2>
            {recentSales.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                No sales yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {recentSales.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2 text-xs text-slate-500">{dtFmt.format(s.soldAt)}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-900">
                          {formatPKR(Number(s.total))}
                          {Number(s.creditAmount) > 0 ? (
                            <span className="ml-2 text-xs text-amber-700">({formatPKR(Number(s.creditAmount))} on credit)</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Audit log for this tenant</h2>
          {recentAudit.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Nothing logged yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAudit.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-xs text-slate-500">{dtFmt.format(a.createdAt)}</td>
                      <td className="px-4 py-2 text-slate-700">{a.actor?.email ?? <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-900">{a.action}</td>
                      <td className="px-4 py-2 text-slate-600">{a.reason ?? <span className="text-slate-400">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                <Link href="/admin/audit" className="font-medium text-indigo-600 hover:text-indigo-700">
                  View full audit log →
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Tile({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        accent ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-amber-800" : "text-slate-500"}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${accent ? "text-amber-900" : "text-slate-900"}`}>
        {value}
      </p>
      {note ? <p className={`mt-1 text-xs ${accent ? "text-amber-800" : "text-slate-500"}`}>{note}</p> : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-indigo-100 text-indigo-800",
    SUSPENDED: "bg-rose-100 text-rose-800",
    ARCHIVED: "bg-slate-200 text-slate-700",
  };
  const cls = styles[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}
