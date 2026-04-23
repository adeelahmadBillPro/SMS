"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface UserMenuProps {
  email: string;
  adminBadge?: boolean;
  logoutAction: () => void | Promise<void>;
}

/**
 * Avatar + dropdown with: profile email, "View as admin" / "Exit admin"
 * toggle (when applicable), Settings, and a real Sign-out form.
 *
 * Previous bug: <Button> defaults to type="button", so clicking it inside
 * the logout <form> never submitted. The Sign-out item in this dropdown
 * is a proper <button type="submit"> inside the form → fires the Server
 * Action.
 */
export function UserMenu({ email, adminBadge, logoutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = email.slice(0, 2).toUpperCase();

  // Click outside closes
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Esc closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      <span className="hidden truncate text-xs text-slate-500 sm:inline">{email}</span>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 py-0.5 pl-1 pr-2.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-[11px] font-semibold text-white shadow-sm">
          {initial}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: [0.33, 1, 0.68, 1] }}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-900/5"
          >
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-semibold text-white">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{email}</p>
                  <p className="text-xs text-slate-500">
                    {adminBadge ? "Super admin" : "Signed in"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 py-1">
              <MenuLink href={adminBadge ? "/admin" : "/dashboard"} onClick={() => setOpen(false)}>
                <IconGrid />
                {adminBadge ? "Admin home" : "Dashboard"}
              </MenuLink>
              {adminBadge ? (
                <>
                  <MenuLink href="/admin/audit" onClick={() => setOpen(false)}>
                    <IconScroll />
                    Audit log
                  </MenuLink>
                  <MenuLink href="/" target="_blank" onClick={() => setOpen(false)}>
                    <IconExternal />
                    View landing
                  </MenuLink>
                </>
              ) : (
                <>
                  <MenuLink href="/settings" onClick={() => setOpen(false)}>
                    <IconCog />
                    Settings
                  </MenuLink>
                  <MenuLink href="/reports" onClick={() => setOpen(false)}>
                    <IconChart />
                    Reports
                  </MenuLink>
                </>
              )}
            </div>

            <div className="border-t border-slate-100 py-1">
              <form action={logoutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="group flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
                >
                  <IconLogOut />
                  Sign out
                </button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  children,
  target,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      target={target}
      onClick={onClick}
      role="menuitem"
      className="group flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-slate-600">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-slate-600">
      <path d="M8 3H3v5" /><path d="M3 16v5h5" /><path d="M21 8V3h-5" /><path d="M16 21h5v-5" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-slate-600">
      <path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
function IconCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-slate-600">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400 group-hover:text-slate-600">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}
function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-rose-500 group-hover:text-rose-600">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
