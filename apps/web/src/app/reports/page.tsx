import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";

interface ReportCard {
  href: string;
  title: string;
  description: string;
}

const REPORTS: ReportCard[] = [
  {
    href: "/reports/sales",
    title: "Sales",
    description: "Daily / weekly / monthly sales. Payment breakdown, category split, top products.",
  },
  {
    href: "/reports/pnl",
    title: "Profit & Loss",
    description: "Revenue, COGS, gross profit, operating expenses, net margin.",
  },
  {
    href: "/reports/stock",
    title: "Stock valuation",
    description: "Current stock × cost. Total valuation + potential retail.",
  },
  {
    href: "/reports/aging",
    title: "Customer aging",
    description: "Receivables bucketed 0-30 / 31-60 / 61-90 / 90+ days.",
  },
  {
    href: "/reports/tax",
    title: "Tax summary",
    description: "Sales tax collected, purchase tax paid, net payable to FBR.",
  },
];

export default async function ReportsIndexPage() {
  const { session, membership } = await requireShop();
  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a report. Every page has a date range picker, print button, and CSV download.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{r.title}</p>
              <p className="mt-1.5 text-sm text-slate-600">{r.description}</p>
              <p className="mt-3 text-xs font-medium text-indigo-600">Open →</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
