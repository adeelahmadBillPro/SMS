import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";

const dtFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const PAGE_SIZE = 100;

interface Props {
  searchParams?: Promise<{ page?: string; action?: string; shop?: string }>;
}

export default async function AuditLogPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") notFound();
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number(sp.page) || 1);
  const actionFilter = sp.action?.trim() || undefined;
  const shopFilter = sp.shop?.trim() || undefined;

  const filter = {
    ...(actionFilter ? { action: { contains: actionFilter, mode: "insensitive" as const } } : {}),
    ...(shopFilter
      ? { OR: [{ shopId: shopFilter }, { impersonatedShopId: shopFilter }] }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prismaAdmin.auditLog.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        actor: { select: { email: true } },
        shop: { select: { name: true } },
      },
    }),
    prismaAdmin.auditLog.count({ where: filter }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell email={session.email} adminBadge hideNav>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-indigo-600">
            <Link href="/admin" className="hover:underline">Platform admin</Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-600">
            {total.toLocaleString("en-PK")} entries · page {page} of {pageCount}
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2" action="/admin/audit" method="get">
          <input
            type="search"
            name="action"
            defaultValue={actionFilter ?? ""}
            placeholder="Filter by action…"
            className="h-10 w-64 rounded-md border border-slate-200 bg-white px-3 text-sm"
          />
          <input
            type="search"
            name="shop"
            defaultValue={shopFilter ?? ""}
            placeholder="Shop ID…"
            className="h-10 w-64 rounded-md border border-slate-200 bg-white px-3 text-sm font-mono text-xs"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filter
          </button>
          {(actionFilter || shopFilter) ? (
            <Link href="/admin/audit" className="text-xs text-slate-500 hover:text-slate-900">
              Reset
            </Link>
          ) : null}
        </form>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No entries match.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="px-4 py-2 text-xs text-slate-500">{dtFmt.format(e.createdAt)}</td>
                    <td className="px-4 py-2 text-slate-900">
                      {e.actor?.email ?? <span className="text-slate-400">—</span>}
                      {e.actorRole ? <div className="text-xs text-slate-500">{e.actorRole}</div> : null}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-900">{e.action}</td>
                    <td className="px-4 py-2">
                      {e.shop ? (
                        <Link href={`/admin/tenants/${e.shopId}`} className="text-slate-900 hover:underline">
                          {e.shop.name}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {e.impersonatedShopId && e.impersonatedShopId !== e.shopId ? (
                        <div className="text-xs text-amber-700">impersonated</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {e.targetTable ? (
                        <>
                          <span className="font-mono">{e.targetTable}</span>
                          {e.targetId ? <div className="font-mono text-[10px] text-slate-400">{e.targetId}</div> : null}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{e.reason ?? <span className="text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={{ pathname: "/admin/audit", query: { page: page - 1, action: actionFilter, shop: shopFilter } }}
                className="inline-flex h-9 items-center rounded-md bg-white px-3 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : <span />}
            {page < pageCount ? (
              <Link
                href={{ pathname: "/admin/audit", query: { page: page + 1, action: actionFilter, shop: shopFilter } }}
                className="inline-flex h-9 items-center rounded-md bg-white px-3 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : <span />}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
