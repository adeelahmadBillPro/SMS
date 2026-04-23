"use client";

import { motion } from "motion/react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      {/* Ambient indigo glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_60%)]"
      >
        <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
      </div>

      <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        {/* ---- Brand side ---- */}
        <aside className="relative hidden overflow-hidden bg-slate-900 text-white lg:flex lg:flex-col">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 10%, rgba(79,70,229,0.35), transparent 50%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.25), transparent 60%)",
            }}
          />
          <div className="relative flex flex-1 flex-col p-12">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
              <BrandMark />
              ShopOS
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              className="mt-auto space-y-8"
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
                  For Pakistani retail shops
                </p>
                <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight xl:text-4xl">
                  Run your dukaan without the chaos.
                </h2>
                <p className="mt-4 max-w-md text-base text-slate-300">
                  Offline billing, udhaar khata, nightly closing, and FBR-ready invoices — all in
                  one app built for mobile, laptop, and electronics shops.
                </p>
              </div>

              <ul className="space-y-4 text-sm text-slate-200">
                <BrandPoint text="Offline-first — sales never stop when the internet drops" />
                <BrandPoint text="Every customer's udhaar balance in one tap, WhatsApp the reminder" />
                <BrandPoint text="One-tap nightly closing with P&L + variance note" />
                <BrandPoint text="Your data stays yours — download everything as CSVs anytime" />
              </ul>

              <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-200">
                  ✦
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">14-day free trial</p>
                  <p className="text-xs text-slate-400">No card required · Cancel anytime</p>
                </div>
              </div>
            </motion.div>

            <div className="relative mt-10 flex items-center justify-between text-xs text-slate-400">
              <span>© {new Date().getFullYear()} ShopOS</span>
              <span>Made for Pakistan 🇵🇰</span>
            </div>
          </div>
        </aside>

        {/* ---- Form side ---- */}
        <div className="relative flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.33, 1, 0.68, 1] }}
            className="w-full max-w-md"
          >
            <Link href="/" className="mb-10 block text-center lg:hidden">
              <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
                <BrandMark tone="dark" />
                ShopOS
              </span>
            </Link>

            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
              {children}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Trouble signing in?{" "}
              <a href="mailto:support@shopos.pk" className="text-indigo-600 hover:text-indigo-700">
                support@shopos.pk
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function BrandMark({ tone = "light" }: { tone?: "light" | "dark" }) {
  const fg = tone === "light" ? "#818cf8" : "#4F46E5";
  const bg = tone === "light" ? "#0F172A" : "#0F172A";
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 20 20">
      <rect x="1" y="1" width="18" height="18" rx="4" fill={bg} />
      <path
        d="M6 13.5c0 1.2 1.1 2 2.8 2 1.7 0 2.6-.8 2.6-1.8 0-1.1-.9-1.6-2.3-1.9l-.9-.2c-1.3-.3-2-.6-2-1.4 0-.8.8-1.3 2-1.3 1.1 0 1.9.5 1.9 1.3"
        fill="none"
        stroke={fg}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandPoint({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="leading-snug">{text}</span>
    </li>
  );
}
