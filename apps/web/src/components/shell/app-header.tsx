import Link from "next/link";
import { logoutAction } from "@/app/(auth)/logout/action";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  email: string;
  contextLabel?: string;
  adminBadge?: boolean;
}

export function AppHeader({ email, contextLabel, adminBadge }: AppHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 hover:opacity-80"
          >
            <ShopOSMark />
            <span>ShopOS</span>
          </Link>
          {adminBadge ? (
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          ) : null}
          {contextLabel ? (
            <>
              <span aria-hidden className="text-slate-300">·</span>
              <span className="truncate text-sm text-slate-600">{contextLabel}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden truncate text-xs text-slate-500 sm:inline">{email}</span>
          <form action={logoutAction}>
            <Button variant="ghost" size="sm">Sign out</Button>
          </form>
        </div>
      </div>
    </header>
  );
}

function ShopOSMark() {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className="text-indigo-600"
    >
      <rect x="1.5" y="1.5" width="17" height="17" rx="4" className="fill-slate-900" />
      <path
        d="M6 13.5c0 1.2 1.1 2 2.8 2 1.7 0 2.6-.8 2.6-1.8 0-1.1-.9-1.6-2.3-1.9l-.9-.2c-1.3-.3-2-.6-2-1.4 0-.8.8-1.3 2-1.3 1.1 0 1.9.5 1.9 1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
