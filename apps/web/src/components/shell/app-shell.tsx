import type { ReactNode } from "react";
import { AppHeader } from "./app-header";
import { AppNav } from "./app-nav";

interface AppShellProps {
  email: string;
  contextLabel?: string;
  adminBadge?: boolean;
  hideNav?: boolean;
  children: ReactNode;
}

export function AppShell({ email, contextLabel, adminBadge, hideNav, children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader email={email} contextLabel={contextLabel} adminBadge={adminBadge} />
      {hideNav ? null : (
        <div className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-2">
            <AppNav />
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
