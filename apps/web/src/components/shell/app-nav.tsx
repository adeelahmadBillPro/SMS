"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface NavItem {
  label: string;
  href: string;
  soon?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "POS", href: "/pos" },
  { label: "Inventory", href: "/inventory" },
  { label: "Purchases", href: "/purchases" },
  { label: "Customers", href: "/customers" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Expenses", href: "/expenses" },
  { label: "Closing", href: "/closing" },
  { label: "Reports", href: "/reports", soon: true },
  { label: "Settings", href: "/settings", soon: true },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="scrollbar-none -mx-6 flex gap-1 overflow-x-auto px-6 md:mx-0 md:px-0"
    >
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (item.soon) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="group relative inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-400"
              title="Coming in Phase 1"
            >
              {item.label}
              <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex shrink-0 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
