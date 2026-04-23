import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { RangePicker } from "./range-picker";
import { rangeQuery, type DateRange } from "./date-range";
import { PrintButton } from "./print-button";

interface Props {
  email: string;
  shopName: string;
  title: string;
  subtitle?: string;
  range?: DateRange;
  csvHref?: string;
  children: ReactNode;
}

export function ReportShell({ email, shopName, title, subtitle, range, csvHref, children }: Props) {
  return (
    <AppShell email={email} contextLabel={shopName}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/reports" className="hover:underline">Reports</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {csvHref ? (
              <a
                href={csvHref}
                className="inline-flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Download CSV
              </a>
            ) : null}
            <PrintButton />
          </div>
        </div>
        {range ? (
          <div className="print:hidden">
            <RangePicker range={range} />
          </div>
        ) : null}
        {children}
      </div>
    </AppShell>
  );
}

export function rangeHref(base: string, range: DateRange): string {
  return `${base}?${rangeQuery(range)}`;
}
