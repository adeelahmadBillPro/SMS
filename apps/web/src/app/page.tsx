"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  CountUp,
  LiveSaleToast,
  Marquee,
  RevealFrom,
  RotatingWord,
  ScrollProgressBar,
  Tilt,
  Typewriter,
  useLiveSaleCounter,
} from "./(landing)/_anim";

const ease = [0.22, 1, 0.36, 1] as const;

const ROTATING_WORDS = [
  "Pakistani retail shop",
  "mobile dukaan",
  "electronics store",
  "laptop centre",
  "accessory shop",
] as const;

const SHOP_NAMES = [
  "Liaqat Mobile Centre",
  "Al-Fatah Electronics",
  "Punjab Laptop Centre",
  "Saddar Phone Wala",
  "Star Mobile World",
  "Iftikhar Bros",
  "Model Town Mobiles",
  "Digital Plaza",
  "Lahore Repair Hub",
  "Karachi Accessories",
  "Gulshan Dukaan",
  "Shahdara Electronics",
] as const;

const features = [
  {
    title: "Offline-first billing",
    body: "Keep ringing up sales when the internet drops. Every bill syncs the moment you're back.",
    icon: IconOffline,
    from: "left" as const,
  },
  {
    title: "Udhaar (credit) ledger",
    body: "Every customer's running balance in one tap. WhatsApp the reminder straight from the app.",
    icon: IconCredit,
    from: "top" as const,
  },
  {
    title: "One-tap nightly closing",
    body: "Reconcile physical cash with the system. Lock the day. Move on with a daily P&L snippet.",
    icon: IconMoon,
    from: "right" as const,
  },
  {
    title: "Reorder before it hurts",
    body: '"Redmi 13C: 6 days of stock left. You sell 2.1/day. Order 50 now." — every morning.',
    icon: IconSpark,
    from: "bottom" as const,
  },
  {
    title: "FBR-ready invoices",
    body: "POS ID + API key encrypted at rest. Every invoice gets a QR once FBR acks. Tier-1 compliant.",
    icon: IconShield,
    from: "left" as const,
  },
  {
    title: "Your data, exportable",
    body: "One click downloads a ZIP of products, sales, customers, ledger — everything. No lock-in.",
    icon: IconDownload,
    from: "right" as const,
  },
];

const plans = [
  {
    code: "single",
    name: "Single shop",
    price: "1,500",
    period: "/month",
    tagline: "Perfect for one counter.",
    cta: "Start 14-day trial",
    href: "/signup",
    highlight: false,
    from: "left" as const,
    features: [
      "Unlimited products, customers, sales",
      "Offline billing (PWA)",
      "Udhaar khata + WhatsApp reminders",
      "Nightly closing + daily reports",
      "FBR POS Integration hook",
      "Email support",
    ],
  },
  {
    code: "multi",
    name: "Multi-branch",
    price: "3,000",
    period: "/month",
    tagline: "Up to 5 branches, consolidated.",
    cta: "Start 14-day trial",
    href: "/signup",
    highlight: true,
    from: "bottom" as const,
    features: [
      "Everything in Single shop",
      "Up to 5 branches with transfers",
      "Consolidated + per-branch reporting",
      "Automated WhatsApp reminders",
      "Priority support (24h response)",
      "Phone OTP for staff 2FA",
    ],
  },
  {
    code: "lifetime",
    name: "Lifetime",
    price: "40,000",
    period: "once",
    tagline: "One payment, forever.",
    cta: "Contact us",
    href: "mailto:sales@shopos.pk",
    highlight: false,
    from: "right" as const,
    features: [
      "Everything in Multi-branch",
      "Lifetime updates — no recurring fee",
      "First priority on new features",
      "Direct founder access",
      "Custom onboarding session",
      "Data migration assistance",
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-x-clip bg-slate-50">
      <ScrollProgressBar />
      <LiveSaleToast />
      <NavBar />

      {/* ======== Hero ======== */}
      <section className="relative">
        <FloatingBlobs />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm backdrop-blur"
            >
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
              </span>
              Built in Pakistan, for Pakistan
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease }}
              className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              The fastest way to run a{" "}
              <span className="relative inline-block">
                <span className="animate-gradient-shift bg-gradient-to-r from-indigo-500 via-indigo-700 to-indigo-500 bg-clip-text text-transparent">
                  <RotatingWord words={ROTATING_WORDS} />
                </span>
              </span>
              .
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease }}
              className="mt-6 max-w-xl text-balance text-base text-slate-600 sm:text-lg"
            >
              <Typewriter
                text="Offline-first billing, inventory & forecasting — built for mobile, laptop, and electronics shops. FBR-ready. WhatsApp-native. One-tap nightly closing."
                startDelay={250}
                speed={16}
              />
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55, ease }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/signup">
                <Button size="lg" className="group relative overflow-hidden hover:animate-wiggle">
                  <span className="relative z-10">Start 14-day free trial</span>
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Button>
              </Link>
              <Link href="#pricing">
                <Button variant="secondary" size="lg">See pricing</Button>
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"
            >
              <Check>No card required</Check>
              <Check>Works offline</Check>
              <Check>FBR built in</Check>
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease }}
            className="relative"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      {/* ======== Trust strip ======== */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
          <RevealFrom direction="bottom" delay={0.0}>
            <Stat value={<>&lt;&nbsp;<CountUp to={150} />ms</>} label="Add to cart (p95)" />
          </RevealFrom>
          <RevealFrom direction="bottom" delay={0.1}>
            <Stat value={<><CountUp to={100} />%</>} label="Offline capable" />
          </RevealFrom>
          <RevealFrom direction="bottom" delay={0.2}>
            <Stat value={<><CountUp to={18} />%</>} label="GST auto-applied" />
          </RevealFrom>
          <RevealFrom direction="bottom" delay={0.3}>
            <Stat value={<CountUp to={0} />} label="Money bugs, by design" />
          </RevealFrom>
        </div>

        <div className="border-t border-slate-100 py-5">
          <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Built for shops like these
          </p>
          <Marquee items={SHOP_NAMES} />
        </div>
      </section>

      {/* ======== Features ======== */}
      <section id="features" className="relative">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <RevealFrom direction="bottom" className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              What you get
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Built for the way PK shops actually work.
            </h2>
            <p className="mt-3 text-slate-600">
              Not a generic POS bolted to a Pakistani invoice. Every feature comes from watching
              mobile and electronics shops run their day.
            </p>
          </RevealFrom>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <RevealFrom key={f.title} direction={f.from} delay={i * 0.05}>
                <Tilt className="h-full">
                  <div className="group h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                      <f.icon />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-900">{f.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
                  </div>
                </Tilt>
              </RevealFrom>
            ))}
          </ul>
        </div>
      </section>

      {/* ======== How it works ======== */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <RevealFrom direction="bottom" className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Your day in three screens
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Open. Sell. Close. Sleep.
            </h2>
          </RevealFrom>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            <RevealFrom direction="left" delay={0.0}>
              <HowCard
                step="01"
                title="Ring up a sale"
                body="Scan the barcode, take cash or credit, print or WhatsApp the receipt. 8 seconds, every sale."
                body2="Keyboard-first for the counter; tap-first on the phone."
              />
            </RevealFrom>
            <RevealFrom direction="bottom" delay={0.1}>
              <HowCard
                step="02"
                title="Track udhaar"
                body="Customer's running balance lives on their page. Aging buckets tell you who to chase first."
                body2="WhatsApp reminder pre-filled with outstanding amount."
              />
            </RevealFrom>
            <RevealFrom direction="right" delay={0.2}>
              <HowCard
                step="03"
                title="Close the day"
                body="Count the drawer. See expected vs actual. Note any variance. Lock the day — no more edits."
                body2="Next morning, yesterday's P&L + top sellers are waiting."
              />
            </RevealFrom>
          </div>
        </div>
      </section>

      {/* ======== Pricing ======== */}
      <section id="pricing" className="relative">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <RevealFrom direction="bottom" className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              One price. No hidden per-bill fees.
            </h2>
            <p className="mt-3 text-slate-600">
              Every plan includes unlimited products, unlimited bills, unlimited customers. 14-day
              free trial, no card required.
            </p>
          </RevealFrom>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((p, i) => (
              <RevealFrom key={p.code} direction={p.from} delay={i * 0.1}>
                <Tilt max={4} className="h-full">
                  <div
                    className={`relative h-full rounded-2xl border p-6 shadow-sm transition-all ${
                      p.highlight
                        ? "border-indigo-300 bg-white ring-2 ring-indigo-600 animate-glow-pulse"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    {p.highlight ? (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                        Most popular
                      </span>
                    ) : null}
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                    <p className="mt-6">
                      <span className="text-xs font-medium text-slate-500">PKR</span>{" "}
                      <span className="text-4xl font-semibold tracking-tight text-slate-900">
                        {p.price}
                      </span>
                      <span className="ml-1 text-sm text-slate-500">{p.period}</span>
                    </p>
                    <Link href={p.href} className="mt-6 block">
                      <Button
                        className="group w-full relative overflow-hidden"
                        variant={p.highlight ? "primary" : "secondary"}
                      >
                        <span className="relative z-10">{p.cta}</span>
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      </Button>
                    </Link>
                    <ul className="mt-6 space-y-2.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-slate-600">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600">
                            <path
                              fillRule="evenodd"
                              d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Tilt>
              </RevealFrom>
            ))}
          </div>
        </div>
      </section>

      {/* ======== CTA ======== */}
      <section className="relative overflow-hidden border-t border-slate-200 bg-slate-900 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-gradient-shift opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 10%, rgba(99,102,241,0.40), transparent 40%), radial-gradient(circle at 85% 80%, rgba(79,70,229,0.35), transparent 45%), radial-gradient(circle at 50% 50%, rgba(129,140,248,0.25), transparent 60%)",
            backgroundSize: "200% 200%",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-20 text-center">
          <RevealFrom direction="top">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop running your shop from a paper khata.
            </h2>
          </RevealFrom>
          <RevealFrom direction="bottom" delay={0.1}>
            <p className="max-w-xl text-slate-300">
              Ring up your first sale in under 5 minutes. Export everything any day. Cancel whenever.
            </p>
          </RevealFrom>
          <RevealFrom direction="bottom" delay={0.2} className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg" className="group relative overflow-hidden">
                <span className="relative z-10">Start 14-day free trial</span>
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </Button>
            </Link>
            <Link
              href="mailto:sales@shopos.pk"
              className="inline-flex h-12 items-center rounded-md bg-white/10 px-5 text-base font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
            >
              Talk to sales
            </Link>
          </RevealFrom>
        </div>
      </section>

      <Footer />
    </main>
  );
}

// ============================================================================
// Navigation
// ============================================================================

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="group inline-flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
          <span className="transition-transform group-hover:rotate-6">
            <BrandMark />
          </span>
          ShopOS
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
          <Link href="#features" className="transition hover:text-slate-900">Features</Link>
          <Link href="#pricing" className="transition hover:text-slate-900">Pricing</Link>
          <a href="mailto:hello@shopos.pk" className="transition hover:text-slate-900">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline">
            Sign in
          </Link>
          <Link href="/signup">
            <Button size="sm" className="group relative overflow-hidden">
              <span className="relative z-10">Start trial</span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <RevealFrom direction="left" delay={0.0}>
          <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-slate-900">
            <BrandMark />
            ShopOS
          </Link>
          <p className="mt-3 max-w-xs text-sm text-slate-600">
            The fastest way to run a Pakistani retail shop. Made in Lahore.
          </p>
        </RevealFrom>
        <RevealFrom direction="bottom" delay={0.1}>
          <FooterColumn
            title="Product"
            links={[
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "Sign in", href: "/login" },
              { label: "Start trial", href: "/signup" },
            ]}
          />
        </RevealFrom>
        <RevealFrom direction="bottom" delay={0.2}>
          <FooterColumn
            title="Support"
            links={[
              { label: "Contact", href: "mailto:hello@shopos.pk" },
              { label: "Help center", href: "#" },
              { label: "Status", href: "#" },
            ]}
          />
        </RevealFrom>
        <RevealFrom direction="right" delay={0.3}>
          <FooterColumn
            title="Legal"
            links={[
              { label: "Privacy", href: "#" },
              { label: "Terms", href: "#" },
              { label: "Data export", href: "/settings" },
            ]}
          />
        </RevealFrom>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} ShopOS · Made for Pakistan 🇵🇰</span>
          <span>Built offline-first · RLS-hardened · FBR-ready</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="transition hover:text-slate-900">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Reusable bits
// ============================================================================

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-indigo-600">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </span>
  );
}

function HowCard({
  step,
  title,
  body,
  body2,
}: {
  step: string;
  title: string;
  body: string;
  body2: string;
}) {
  return (
    <div className="group h-full rounded-2xl border border-slate-200 bg-slate-50 p-7 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-md">
      <p className="font-mono text-xs font-semibold tracking-wider text-indigo-600">{step}</p>
      <p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{body2}</p>
    </div>
  );
}

function BrandMark() {
  return (
    <svg aria-hidden width="24" height="24" viewBox="0 0 20 20">
      <rect x="1" y="1" width="18" height="18" rx="4" fill="#0F172A" />
      <path
        d="M6 13.5c0 1.2 1.1 2 2.8 2 1.7 0 2.6-.8 2.6-1.8 0-1.1-.9-1.6-2.3-1.9l-.9-.2c-1.3-.3-2-.6-2-1.4 0-.8.8-1.3 2-1.3 1.1 0 1.9.5 1.9 1.3"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FloatingBlobs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[-6rem] h-[40rem] [mask-image:radial-gradient(55%_55%_at_50%_40%,black,transparent)]"
    >
      <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl animate-float-slow" />
      <div className="absolute right-[15%] top-[10%] h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
      <div className="absolute left-[40%] top-[50%] h-80 w-80 rounded-full bg-blue-200/30 blur-3xl animate-float-slow" style={{ animationDelay: "-6s" }} />
    </div>
  );
}

// ============================================================================
// Hero mockup — live POS with ticking sale counter
// ============================================================================

function HeroMockup() {
  const { saleNo, total } = useLiveSaleCounter(4500);
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, rotate: 8, x: 20 }}
        animate={{ opacity: 1, rotate: 3, x: 0 }}
        transition={{ duration: 0.7, delay: 0.6, ease }}
        className="absolute -right-6 top-6 hidden w-48 rotate-3 rounded-md border border-slate-200 bg-white p-4 shadow-lg lg:block"
      >
        <p className="text-center text-[10px] font-semibold tracking-wider text-slate-900">
          LIAQAT MOBILE CENTRE
        </p>
        <p className="text-center text-[8px] text-slate-400">Gulberg, Lahore · NTN 1234567</p>
        <hr className="my-2 border-dashed border-slate-300" />
        <div className="space-y-0.5 text-[9px] text-slate-700">
          <div className="flex justify-between"><span>1× Redmi 13C 128GB</span><span>32,000</span></div>
          <div className="flex justify-between"><span>1× Fast Charger</span><span>800</span></div>
        </div>
        <hr className="my-2 border-dashed border-slate-300" />
        <div className="flex justify-between text-[10px] font-semibold text-slate-900">
          <span>Total</span>
          <span>Rs. 32,800</span>
        </div>
        <p className="mt-2 text-center text-[7px] text-slate-400">Thank you!</p>
      </motion.div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
          <span className="ml-2 text-xs font-medium text-slate-500">
            ShopOS · POS · Sale #{saleNo}
          </span>
          <span className="ml-auto flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
            Live
          </span>
        </div>

        <div className="grid grid-cols-[1.2fr_1fr] gap-0 text-sm">
          <div className="border-r border-slate-200 p-5">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Scan barcode or search…
            </div>
            <div className="mt-4 space-y-2.5">
              <CartLine name="Redmi 13C 128GB" sku="PHN-RED13C" qty={1} total={32000} />
              <CartLine name="Fast Charger 65W" sku="CHG-65W" qty={1} total={800} />
              <CartLine name="Tempered Glass" sku="COV-TG" qty={2} total={400} />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="tabular-nums text-slate-900">33,200</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax (0%)</span>
              <span className="tabular-nums text-slate-900">0</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2.5 text-base">
              <span className="font-medium text-slate-900">Total</span>
              <motion.span
                key={total}
                initial={{ scale: 1.15, color: "#4F46E5" }}
                animate={{ scale: 1, color: "#0F172A" }}
                transition={{ duration: 0.6 }}
                className="tabular-nums text-lg font-semibold"
              >
                {total.toLocaleString("en-PK")}
              </motion.span>
            </div>
            <div className="!mt-4 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button className="rounded border border-slate-200 bg-white px-2 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50">
                  Cash
                </button>
                <button className="rounded bg-indigo-50 px-2 py-1.5 font-medium text-indigo-900 ring-1 ring-indigo-300">
                  JazzCash ✓
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full rounded-md bg-slate-900 py-2 font-medium text-white shadow"
              >
                Complete sale · {total.toLocaleString("en-PK")}
              </motion.button>
            </div>
            <div className="!mt-4 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
              <p className="font-medium">FBR pending</p>
              <p className="text-amber-800">Posts to FBR in the background.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartLine({ name, sku, qty, total }: { name: string; sku: string; qty: number; total: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 transition hover:border-slate-200">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
        <p className="truncate font-mono text-[10px] text-slate-400">{sku}</p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">×{qty}</span>
        <span className="tabular-nums font-semibold text-slate-900">{total.toLocaleString("en-PK")}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function IconOffline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
      <path d="M1.42 9 23 22" />
    </svg>
  );
}
function IconCredit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" />
      <path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" />
      <path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}
