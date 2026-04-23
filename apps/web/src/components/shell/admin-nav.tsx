"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface Item {
  label: string;
  href: string;
  icon: React.ComponentType;
}

const ADMIN_NAV: Item[] = [
  { label: "Overview", href: "/admin", icon: IconGrid },
  { label: "Tenants", href: "/admin#tenants", icon: IconUsers },
  { label: "Audit log", href: "/admin/audit", icon: IconScroll },
  { label: "View landing", href: "/", icon: IconExternal },
];

interface Props {
  mobile?: boolean;
  email?: string;
}

export function AdminNav({ mobile = false, email }: Props) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4">
        {ADMIN_NAV.map((i) => {
          const active = pathname === i.href.split("#")[0];
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <BrandMark />
        <span className="text-base font-semibold tracking-tight text-slate-900">ShopOS</span>
        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          Admin
        </span>
      </Link>

      <nav className="flex-1 py-3">
        <ul className="space-y-0.5 px-3">
          {ADMIN_NAV.map((i) => {
            const [base] = i.href.split("#");
            const active = pathname === base || pathname.startsWith(`${base}/`);
            const Icon = i.icon;
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  target={i.href.startsWith("/") && !i.href.startsWith("/admin") ? "_blank" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
                    <Icon />
                  </span>
                  {i.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-100 px-5 py-3">
        <p className="truncate text-xs text-slate-500">{email ?? "Platform admin"}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Super admin · audit-logged</p>
      </div>
    </div>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function BrandMark() {
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 20 20">
      <rect x="1" y="1" width="18" height="18" rx="4" fill="#0F172A" />
      <path
        d="M6 13.5c0 1.2 1.1 2 2.8 2 1.7 0 2.6-.8 2.6-1.8 0-1.1-.9-1.6-2.3-1.9l-.9-.2c-1.3-.3-2-.6-2-1.4 0-.8.8-1.3 2-1.3 1.1 0 1.9.5 1.9 1.3"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
