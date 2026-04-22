import { notFound, redirect } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { TenantsTable, type TenantRow } from "./tenants-table";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") notFound();

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [tenantsRaw, userCount, newTenants7d, trialingCount] = await Promise.all([
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
      take: 200,
    }),
    prismaAdmin.user.count(),
    prismaAdmin.shop.count({ where: { createdAt: { gte: since7d } } }),
    prismaAdmin.subscription.count({ where: { status: "TRIALING" } }),
  ]);

  const tenants: TenantRow[] = tenantsRaw.map((t) => {
    const sub = t.subscriptions[0];
    return {
      id: t.id,
      name: t.name,
      createdAt: t.createdAt.toISOString(),
      plan: sub?.plan.name ?? null,
      status: sub?.status ?? null,
      memberCount: t._count.members,
      openingCash: Number(t.openingCash),
    };
  });

  return (
    <AppShell email={session.email} adminBadge hideNav>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Platform admin</h1>
          <p className="mt-1 text-sm text-slate-600">
            Oversee tenants, subscriptions, and platform health.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Tenants" value={tenants.length.toLocaleString("en-PK")} />
          <StatTile label="Users" value={userCount.toLocaleString("en-PK")} />
          <StatTile label="Trialing" value={trialingCount.toLocaleString("en-PK")} accent />
          <StatTile label="New in 7 days" value={newTenants7d.toLocaleString("en-PK")} />
        </div>

        <TenantsTable rows={tenants} />
      </div>
    </AppShell>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        accent ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          accent ? "text-indigo-700" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums ${
          accent ? "text-indigo-900" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
