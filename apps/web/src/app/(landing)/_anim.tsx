"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ================================================================
 * Scroll progress bar — thin indigo line at the top, fills with scroll
 * ================================================================ */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0 0" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-800"
    />
  );
}

/* ================================================================
 * RevealFrom — scroll-triggered entrance from any direction
 * ================================================================ */
type Direction = "left" | "right" | "top" | "bottom" | "scale";
const OFFSETS: Record<Direction, { x?: number; y?: number; scale?: number }> = {
  left:   { x: -48, y: 0 },
  right:  { x: 48, y: 0 },
  top:    { x: 0, y: -40 },
  bottom: { x: 0, y: 40 },
  scale:  { scale: 0.9 },
};

export function RevealFrom({
  children,
  direction = "bottom",
  delay = 0,
  className,
  once = true,
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const off = OFFSETS[direction];
  return (
    <motion.div
      initial={{ opacity: 0, ...off }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, margin: "-12%" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ================================================================
 * RotatingWord — swaps a word every N ms with a smooth slide
 * ================================================================ */
export function RotatingWord({
  words,
  intervalMs = 2600,
  className,
}: {
  words: readonly string[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((prev) => (prev + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className={`relative inline-block align-baseline ${className ?? ""}`}>
      {/* Width reservation — uses the longest word as a ghost so layout doesn't jump */}
      <span aria-hidden className="invisible whitespace-nowrap">
        {words.reduce((a, b) => (a.length > b.length ? a : b))}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: "0.4em", filter: "blur(4px)" }}
          animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-0.4em", filter: "blur(4px)" }}
          transition={{ duration: 0.42, ease: [0.33, 1, 0.68, 1] }}
          className="absolute inset-0 whitespace-nowrap"
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ================================================================
 * Typewriter — char-by-char reveal, starts when in view
 * ================================================================ */
export function Typewriter({
  text,
  speed = 26,
  startDelay = 0,
  className,
  caret = true,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
  caret?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = (n: number) => {
      if (n >= text.length) return;
      t = setTimeout(() => {
        setShown(n + 1);
        tick(n + 1);
      }, speed);
    };
    const start = setTimeout(() => tick(shown), startDelay);
    return () => {
      clearTimeout(start);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  const done = shown >= text.length;
  return (
    <span ref={ref} className={className}>
      {text.slice(0, shown)}
      {caret ? (
        <span
          className={`ml-0.5 inline-block w-[2px] bg-current ${done ? "animate-caret" : ""}`}
          style={{ height: "1em", verticalAlign: "-0.12em" }}
          aria-hidden
        />
      ) : null}
    </span>
  );
}

/* ================================================================
 * CountUp — numeric count from 0 → target when visible
 * ================================================================ */
export function CountUp({
  to,
  duration = 1.4,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const [display, setDisplay] = useState<string>(() => formatVal(0, decimals));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(v) {
        setDisplay(formatVal(v, decimals));
      },
    });
    return () => controls.stop();
  }, [inView, to, duration, decimals]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function formatVal(v: number, decimals: number): string {
  const rounded = Math.round(v * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return rounded.toLocaleString("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/* ================================================================
 * Tilt — 3D tilt on mouse move (feature + pricing cards)
 * ================================================================ */
export function Tilt({
  children,
  max = 7,
  className,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotX = useTransform(y, [-0.5, 0.5], [max, -max]);
  const rotY = useTransform(x, [-0.5, 0.5], [-max, max]);
  const springX = useSpring(rotX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 200, damping: 20 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }
  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: springX as unknown as MotionValue<number>,
        rotateY: springY as unknown as MotionValue<number>,
        transformStyle: "preserve-3d",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ================================================================
 * Marquee — infinite horizontal scroll (social-proof strip)
 * ================================================================ */
export function Marquee({ items, className }: { items: readonly string[]; className?: string }) {
  // Duplicate the list so the -50% translate loops seamlessly.
  const doubled = [...items, ...items];
  return (
    <div className={`group relative overflow-hidden ${className ?? ""}`}>
      <div className="flex w-max items-center gap-10 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]">
        {doubled.map((s, i) => (
          <span
            key={`${s}-${i}`}
            className="inline-flex items-center gap-3 text-sm text-slate-500"
          >
            <span className="inline-block h-1 w-1 rounded-full bg-slate-300" />
            {s}
          </span>
        ))}
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}

/* ================================================================
 * LiveSaleToast — popups in from the right on an interval
 *                 Shows fake shop sales ("Al-Fatah just rang up Rs 3,200")
 * ================================================================ */
const FAKE_SALES: ReadonlyArray<{ shop: string; amount: number; item: string }> = [
  { shop: "Al-Fatah Electronics", amount: 32800, item: "Redmi 13C" },
  { shop: "Model Town Mobiles", amount: 1200, item: "Fast Charger" },
  { shop: "Saddar Phone Wala", amount: 8500, item: "Oppo A58" },
  { shop: "Digital Plaza", amount: 54000, item: "HP Laptop" },
  { shop: "Iftikhar Bros", amount: 650, item: "Tempered Glass" },
  { shop: "Liaqat Mobile Centre", amount: 15900, item: "Infinix Hot 40" },
];

export function LiveSaleToast({ intervalMs = 6500 }: { intervalMs?: number }) {
  const [i, setI] = useState(-1); // start hidden

  useEffect(() => {
    // First one after 3.5s, then every intervalMs
    const kickoff = setTimeout(() => setI(0), 3500);
    return () => clearTimeout(kickoff);
  }, []);

  useEffect(() => {
    if (i < 0) return;
    const t = setTimeout(() => setI((n) => (n + 1) % FAKE_SALES.length), intervalMs);
    return () => clearTimeout(t);
  }, [i, intervalMs]);

  const current = i >= 0 ? FAKE_SALES[i] : null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-50 hidden lg:block">
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={`${current.shop}-${i}`}
            initial={{ opacity: 0, x: -40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 pr-5 shadow-lg backdrop-blur"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-lg">
              🧾
            </span>
            <div className="text-xs">
              <p className="font-medium text-slate-900">{current.shop}</p>
              <p className="text-slate-500">
                just sold {current.item} ·{" "}
                <span className="font-semibold text-indigo-700">
                  Rs {current.amount.toLocaleString("en-PK")}
                </span>
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
 * LiveCart — a POS mockup whose total ticks up periodically
 * ================================================================ */
export function useLiveSaleCounter(intervalMs = 4200): { saleNo: number; total: number } {
  const [saleNo, setSaleNo] = useState(1247);
  const [total, setTotal] = useState(33200);

  useEffect(() => {
    const id = setInterval(() => {
      setSaleNo((n) => n + 1);
      setTotal((t) => t + Math.round(Math.random() * 4000 + 200));
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { saleNo, total };
}
