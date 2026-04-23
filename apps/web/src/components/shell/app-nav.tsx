"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: IconGrid },
  { label: "POS", href: "/pos", icon: IconShop },
  { label: "Inventory", href: "/inventory", icon: IconBox },
  { label: "Purchases", href: "/purchases", icon: IconTruck },
  { label: "Customers", href: "/customers", icon: IconUsers },
  { label: "Suppliers", href: "/suppliers", icon: IconBuilding },
  { label: "Expenses", href: "/expenses", icon: IconReceipt },
  { label: "Closing", href: "/closing", icon: IconMoon },
  { label: "Reports", href: "/reports", icon: IconChart },
  { label: "Settings", href: "/settings", icon: IconCog },
];

interface Props {
  mobile?: boolean;
  email?: string;
  contextLabel?: string;
}

export function AppNav({ mobile = false, email, contextLabel }: Props) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="Primary"
        className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4"
      >
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (item.soon) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-400"
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  // Desktop sidebar
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <BrandMark />
        <span className="text-base font-semibold tracking-tight text-slate-900">ShopOS</span>
      </Link>

      {/* Shop context */}
      {contextLabel ? (
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Shop
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-slate-900">{contextLabel}</p>
        </div>
      ) : null}

      {/* Nav list */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            if (item.soon) {
              return (
                <li key={item.href}>
                  <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400">
                    <Icon />
                    {item.label}
                    <span className="ml-auto rounded bg-slate-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      Soon
                    </span>
                  </span>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <span className={cn("transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
                    <Icon />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer hint */}
      <div className="border-t border-slate-100 px-5 py-3">
        <p className="truncate text-xs text-slate-500">{email ?? "Signed in"}</p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">/</kbd> to search on POS
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconShop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 9l1-5h16l1 5" /><path d="M5 9v12h14V9" /><path d="M9 21v-6h6v6" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
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
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="1" /><path d="M9 9h.01" /><path d="M15 9h.01" />
      <path d="M9 15h.01" /><path d="M15 15h.01" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2" /><path d="M16 8H8" /><path d="M16 12H8" /><path d="M10 16H8" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function IconCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
