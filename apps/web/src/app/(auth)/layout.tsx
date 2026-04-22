"use client";

import { motion } from "motion/react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-50">
      {/* Ambient indigo glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_50%_30%,black,transparent_60%)]"
      >
        <div className="absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.33, 1, 0.68, 1] }}
          className="w-full max-w-md"
        >
          <Link href="/" className="mb-10 block text-center">
            <span className="text-lg font-semibold tracking-tight text-slate-900">ShopOS</span>
          </Link>

          <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
