import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppNav } from "./app-nav";
import { AdminNav } from "./admin-nav";

interface AppShellProps {
  email: string;
  contextLabel?: string;
  adminBadge?: boolean;
  /** Legacy flag kept for the admin surfaces that used to hide the nav.
   *  Now it swaps the sidebar to admin-specific items. */
  hideNav?: boolean;
  children: ReactNode;
}

/**
 * Layout: fixed sticky sidebar on the left (desktop) + scrolling main
 * content on the right. On mobile the sidebar collapses into a top bar
 * strip. Top bar is sticky inside the main column with the user menu
 * and shop context.
 */
export function AppShell({ email, contextLabel, adminBadge, hideNav, children }: AppShellProps) {
  const adminMode = !!(hideNav && adminBadge);
  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* ====== Sidebar (desktop, sticky) ====== */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {adminMode ? <AdminNav email={email} /> : <AppNav email={email} contextLabel={contextLabel} />}
      </aside>

      {/* ====== Main column ====== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky top bar (holds user menu + mobile nav) */}
        <AppHeader email={email} contextLabel={contextLabel} adminBadge={adminBadge} />

        {/* Mobile-only horizontal nav strip (desktop sidebar replaces this) */}
        <div className="border-b border-slate-200 bg-white lg:hidden">
          <div className="px-4 py-2">
            {adminMode ? <AdminNav mobile /> : <AppNav mobile />}
          </div>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
