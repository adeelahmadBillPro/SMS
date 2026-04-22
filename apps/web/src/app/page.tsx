"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

const features = [
  { title: "Offline-first billing", body: "Keep ringing up sales when the internet drops. Syncs the moment it's back." },
  { title: "Udhaar (credit) ledger", body: "Every customer's balance in one tap. WhatsApp the reminder straight from the app." },
  { title: "One-tap nightly closing", body: "Reconcile physical cash with the system. Lock the day. Move on." },
  { title: "Reorder before it hurts", body: "\"Redmi 13C 128GB: 6 days of stock left. You sell 2.1/day. Order now.\"" },
  { title: "FBR-ready invoices", body: "Digital invoice number + QR built in for Tier-1 compliance." },
  { title: "Your data, exportable", body: "One click downloads a ZIP of everything. No lock-in." },
];

const ease = [0.33, 1, 0.68, 1] as const;

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Ambient gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-8rem] h-[30rem] [mask-image:radial-gradient(50%_50%_at_50%_50%,black,transparent)]"
      >
        <div className="mx-auto h-full max-w-5xl bg-indigo-100/50 blur-3xl" />
      </div>

      <section className="mx-auto flex min-h-[75dvh] max-w-4xl flex-col items-center justify-center gap-8 px-6 py-20 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease }}
          className="text-xs uppercase tracking-[0.2em] text-indigo-600"
        >
          ShopOS
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease }}
          className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl"
        >
          The fastest way to run a<br />Pakistani retail shop.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease }}
          className="mx-auto max-w-xl text-balance text-base text-slate-600 sm:text-lg"
        >
          Offline-first billing, inventory, and forecasting — built for mobile, laptop, and
          electronics shops. FBR-ready. WhatsApp-native. One-tap nightly closing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/signup">
            <Button size="lg">Start 14-day free trial</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">Sign in</Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.26 }}
          className="text-xs text-slate-400"
        >
          No card required · Works offline · FBR POS Integration built in
        </motion.p>
      </section>

      <section className="relative border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="mb-12 text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
            Built for the way PK shops actually work
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.li
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.36, delay: i * 0.04, ease }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5"
              >
                <p className="text-sm font-semibold text-slate-900">{f.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} ShopOS</span>
          <span>Made for Pakistan</span>
        </div>
      </footer>
    </main>
  );
}
