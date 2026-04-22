"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export interface TenantRow {
  id: string;
  name: string;
  createdAt: string;
  plan: string | null;
  status: string | null;
  memberCount: number;
  openingCash: number;
}

type SortKey = "name" | "createdAt" | "status" | "memberCount" | "openingCash";
type SortDir = "asc" | "desc";

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

export function TenantsTable({ rows }: { rows: TenantRow[] }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const src = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q) ||
            (r.plan ?? "").toLowerCase().includes(q),
        )
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...src].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Search shops, IDs, plans…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter tenants"
          />
        </div>
        <p className="text-xs text-slate-500">
          {filtered.length} of {rows.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <Th label="Shop" sortKey="name" active={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Signed up" sortKey="createdAt" active={sortKey} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3">Plan</th>
              <Th label="Status" sortKey="status" active={sortKey} dir={sortDir} onSort={toggleSort} />
              <Th label="Members" sortKey="memberCount" active={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              <Th label="Opening cash" sortKey="openingCash" active={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                  {rows.length === 0
                    ? "No tenants yet. Sign up a test shop from the landing page to see one here."
                    : "No tenants match that search."}
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="text-sm hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{t.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{t.id}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {dateFmt.format(new Date(t.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.plan ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t.status ? <StatusPill status={t.status} /> : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.memberCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {pkrFmt.format(t.openingCash)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  const indicator = isActive ? (dir === "asc" ? "↑" : "↓") : "";
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider hover:text-slate-700 ${
          isActive ? "text-slate-900" : "text-slate-500"
        }`}
      >
        {label}
        {indicator ? <span aria-hidden>{indicator}</span> : null}
      </button>
    </th>
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
