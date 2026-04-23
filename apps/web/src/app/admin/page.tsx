import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { TenantsTable, type TenantRow } from "./tenants-table";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") notFound();

  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    tenantsRaw,
    userCount,
    newTenants7d,
    newTenants14d,
    trialingCount,
    activeCount,
    suspendedCount,
    recentAudit,
    dailySignups,
  ] = await Promise.all([
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
    prismaAdmin.shop.count({ where: { createdAt: { gte: since14d, lt: since7d } } }),
    prismaAdmin.subscription.count({ where: { status: "TRIALING" } }),
    prismaAdmin.shop.count({ where: { status: "ACTIVE" } }),
    prismaAdmin.shop.count({ where: { status: "SUSPENDED" } }),
    prismaAdmin.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { email: true } } },
    }),
    prismaAdmin.$queryRawUnsafe<Array<{ d: string; n: bigint }>>(
      `SELECT to_char(d::date, 'YYYY-MM-DD') AS d,
              COALESCE((SELECT count(*) FROM shop WHERE created_at::date = d::date), 0)::bigint AS n
         FROM generate_series(NOW() - INTERVAL '13 days', NOW(), INTERVAL '1 day') AS d
        ORDER BY d ASC`,
    ),
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

  // Week-over-week tenant growth
  const wowChange =
    newTenants14d === 0
      ? null
      : Math.round(((newTenants7d - newTenants14d) / Math.max(newTenants14d, 1)) * 100);

  // Sparkline points
  const sparklineData = dailySignups.map((r) => Number(r.n));
  const maxSparkline = Math.max(...sparklineData, 1);

  return (
    <AppShell email={session.email} adminBadge hideNav>
      <div className="space-y-8">
        {/* ======== Welcome hero ======== */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 p-8 text-white shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 10%, rgba(99,102,241,0.4), transparent 50%), radial-gradient(circle at 90% 80%, rgba(79,70,229,0.3), transparent 55%)",
            }}
          />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Welcome back, {session.email.split("@")[0]} 👋
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Platform admin
              </h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Oversee tenants, subscriptions, and platform health. Every sensitive action
                you take here is audit-logged.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/audit"
                className="inline-flex h-10 items-center rounded-md bg-white/10 px-4 text-sm font-medium ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                Audit log →
              </Link>
              <Link
                href="/"
                target="_blank"
                className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
              >
                View landing ↗
              </Link>
            </div>
          </div>

          {/* Inline platform health pills */}
          <div className="relative mt-6 flex flex-wrap items-center gap-2 text-xs">
            <HealthPill tone="indigo" label={`${activeCount} active`} />
            <HealthPill tone="amber" label={`${trialingCount} trialing`} />
            {suspendedCount > 0 ? <HealthPill tone="rose" label={`${suspendedCount} suspended`} /> : null}
            <HealthPill tone="muted" label={`${userCount} users across platform`} />
          </div>
        </section>

        {/* ======== Stat tiles with sparklines + trend ======== */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Tenants"
            value={tenants.length}
            sparkline={sparklineData}
            sparkMax={maxSparkline}
            note="All shops on the platform"
          />
          <StatTile
            label="New in 7 days"
            value={newTenants7d}
            trend={wowChange}
            note={wowChange == null ? "No prior-week data yet" : `vs previous 7 days`}
            accent={newTenants7d > 0}
          />
          <StatTile
            label="Trialing"
            value={trialingCount}
            note="Active 14-day trials"
            accent={trialingCount > 0}
            tone="indigo"
          />
          <StatTile
            label="Users"
            value={userCount}
            note="Registered accounts"
          />
        </div>

        {/* ======== Quick actions ======== */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Quick actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              icon={<IconUsers />}
              title="Tenants"
              subtitle={`Manage ${tenants.length} shop${tenants.length === 1 ? "" : "s"}`}
              href="#tenants"
            />
            <QuickAction
              icon={<IconScroll />}
              title="Audit log"
              subtitle="All platform actions"
              href="/admin/audit"
            />
            <QuickAction
              icon={<IconHeart />}
              title="Platform health"
              subtitle={`${activeCount}/${activeCount + suspendedCount} shops up`}
              href="#"
              muted
            />
            <QuickAction
              icon={<IconBook />}
              title="Docs"
              subtitle="SPEC, setup, roadmap"
              href="https://github.com/adeelahmadBillPro/SMS"
              external
            />
          </div>
        </section>

        {/* ======== Recent activity + signups chart ======== */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Signups last 14 days chart */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Signups · last 14 days</h2>
                <p className="text-xs text-slate-500">
                  {sparklineData.reduce((a, b) => a + b, 0)} total signups
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                Live
              </span>
            </div>
            <div className="p-5">
              <BarChart values={sparklineData} labels={dailySignups.map((r) => r.d)} />
            </div>
          </div>

          {/* Recent audit */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
              <Link href="/admin/audit" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentAudit.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-slate-500">
                  No activity yet. Actions you take on tenant pages show up here.
                </li>
              ) : (
                recentAudit.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                      {(a.actor?.email ?? "?").slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-900">
                        <span className="font-mono text-xs text-slate-700">{a.action}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {a.actor?.email ?? "—"} · {relativeTime(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        {/* ======== Tenants table ======== */}
        <section id="tenants" className="space-y-3 scroll-mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tenants</h2>
              <p className="text-sm text-slate-500">
                Click any row to open the tenant detail — suspend, extend trial, see audit trail.
              </p>
            </div>
          </div>
          <TenantsTable rows={tenants} />
        </section>
      </div>
    </AppShell>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatTile({
  label,
  value,
  note,
  trend,
  accent,
  tone = "indigo",
  sparkline,
  sparkMax,
}: {
  label: string;
  value: number;
  note?: string;
  trend?: number | null;
  accent?: boolean;
  tone?: "indigo" | "amber" | "rose";
  sparkline?: number[];
  sparkMax?: number;
}) {
  const toneMap = {
    indigo: { border: "border-indigo-200", bg: "bg-indigo-50", fg: "text-indigo-900", sub: "text-indigo-700" },
    amber: { border: "border-amber-200", bg: "bg-amber-50", fg: "text-amber-900", sub: "text-amber-800" },
    rose: { border: "border-rose-200", bg: "bg-rose-50", fg: "text-rose-900", sub: "text-rose-800" },
  };
  const t = toneMap[tone];

  return (
    <div
      className={`relative rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
        accent ? `${t.border} ${t.bg}` : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${accent ? t.sub : "text-slate-500"}`}>
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-3xl font-semibold tabular-nums ${accent ? t.fg : "text-slate-900"}`}>
          {value.toLocaleString("en-PK")}
        </p>
        {trend != null ? (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium ${
              trend > 0
                ? "bg-indigo-100 text-indigo-800"
                : trend < 0
                  ? "bg-rose-100 text-rose-800"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {trend > 0 ? "▲" : trend < 0 ? "▼" : "·"} {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      {sparkline ? (
        <div className="mt-3">
          <Sparkline values={sparkline} max={sparkMax ?? 1} />
        </div>
      ) : null}
      {note ? (
        <p className={`mt-2 text-xs ${accent ? t.sub : "text-slate-500"}`}>{note}</p>
      ) : null}
    </div>
  );
}

function Sparkline({ values, max }: { values: number[]; max: number }) {
  const w = 100;
  const h = 24;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`)
    .join(" ");
  const area = `M0,${h} L${points.split(" ").join(" L ")} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-grad)" />
      <polyline
        points={points}
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BarChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(...values, 1);
  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {values.map((v, i) => {
          const pct = (v / max) * 100;
          return (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end">
              <div className="relative w-full">
                {v > 0 ? (
                  <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {v}
                  </span>
                ) : null}
                <div
                  className={`w-full rounded-t transition-all group-hover:bg-indigo-700 ${
                    v > 0 ? "bg-indigo-500" : "bg-slate-100"
                  }`}
                  style={{ height: `${Math.max(pct, v > 0 ? 6 : 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-[10px] text-slate-400">
        {values.map((_, i) => {
          const showLabel = i === 0 || i === values.length - 1 || i === Math.floor(values.length / 2);
          return (
            <span key={i} className="flex flex-1 justify-center">
              {showLabel && labels[i] ? dateFmt.format(new Date(labels[i])) : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  href,
  muted,
  external,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  muted?: boolean;
  external?: boolean;
}) {
  const cls = `group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${
    muted ? "pointer-events-none opacity-60" : ""
  }`;
  const content = (
    <>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600">
        →
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

function HealthPill({ tone, label }: { tone: "indigo" | "amber" | "rose" | "muted"; label: string }) {
  const classes = {
    indigo: "bg-indigo-500/20 text-indigo-100 ring-indigo-300/30",
    amber: "bg-amber-500/20 text-amber-100 ring-amber-300/30",
    rose: "bg-rose-500/20 text-rose-100 ring-rose-300/30",
    muted: "bg-white/10 text-slate-300 ring-white/20",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ring-1 ring-inset backdrop-blur ${classes}`}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          tone === "indigo"
            ? "bg-indigo-300"
            : tone === "amber"
              ? "bg-amber-300"
              : tone === "rose"
                ? "bg-rose-300"
                : "bg-slate-300"
        }`}
      />
      {label}
    </span>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

// ============================================================================
// Icons
// ============================================================================

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M15 3h6v6" /><path d="M10 21H4v-6" /><path d="m21 3-7 7" /><path d="m3 21 7-7" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
