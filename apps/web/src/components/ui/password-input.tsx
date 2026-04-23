"use client";

import { forwardRef, useMemo, useState, type InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/cn";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: boolean;
  showStrength?: boolean;
  /** Min length used by the strength meter (signup uses 10). */
  minLength?: number;
}

/**
 * Password field with:
 *   - show/hide eye toggle
 *   - optional strength meter (bar + label + rule hints)
 *   - caps-lock hint (some shopkeepers type with caps lock on and wonder why)
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, error, showStrength = false, minLength = 10, value, onChange, ...props },
    ref,
  ) {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);
    const [localValue, setLocalValue] = useState<string>(String(value ?? ""));
    const effective = value !== undefined ? String(value) : localValue;

    const strength = useMemo(() => scorePassword(effective, minLength), [effective, minLength]);

    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            ref={ref}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => {
              if (value === undefined) setLocalValue(e.target.value);
              onChange?.(e);
            }}
            onKeyUp={(e) => {
              const on =
                typeof e.getModifierState === "function" && e.getModifierState("CapsLock");
              setCapsLock(Boolean(on));
            }}
            onBlur={(e) => {
              setCapsLock(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "flex h-10 w-full rounded-md border bg-white pl-3 pr-11 py-2 text-sm text-slate-900 shadow-sm",
              "placeholder:text-slate-400",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-colors duration-100",
              error
                ? "border-rose-500 focus-visible:ring-rose-500"
                : "border-slate-200 hover:border-slate-300",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            tabIndex={-1}
            className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <AnimatePresence>
          {capsLock ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              Caps Lock is on
            </motion.p>
          ) : null}
        </AnimatePresence>

        {showStrength && effective.length > 0 ? (
          <StrengthMeter strength={strength} />
        ) : null}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Strength meter
// ---------------------------------------------------------------------------

type StrengthTier = "very-weak" | "weak" | "medium" | "strong" | "very-strong";

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  tier: StrengthTier;
  label: string;
  rules: Array<{ id: string; label: string; pass: boolean }>;
}

function scorePassword(pw: string, minLength: number): PasswordStrength {
  const rules = [
    { id: "len", label: `${minLength}+ characters`, pass: pw.length >= minLength },
    { id: "long", label: "14+ characters (stronger)", pass: pw.length >= 14 },
    { id: "mix", label: "upper + lower case", pass: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
    { id: "digit", label: "a number", pass: /\d/.test(pw) },
    { id: "sym", label: "a symbol (!@#$…)", pass: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = rules.filter((r) => r.pass).length as PasswordStrength["score"];
  const tier: StrengthTier =
    score <= 1 ? "very-weak" : score === 2 ? "weak" : score === 3 ? "medium" : score === 4 ? "strong" : "very-strong";
  const label =
    tier === "very-weak"
      ? "Very weak"
      : tier === "weak"
        ? "Weak"
        : tier === "medium"
          ? "Medium"
          : tier === "strong"
            ? "Strong"
            : "Very strong";
  return { score, tier, label, rules };
}

function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  const filled = strength.score;
  // Tier → tone
  const tone =
    strength.tier === "very-weak" || strength.tier === "weak"
      ? { bar: "bg-rose-500", text: "text-rose-700" }
      : strength.tier === "medium"
        ? { bar: "bg-amber-500", text: "text-amber-800" }
        : { bar: "bg-indigo-600", text: "text-indigo-800" };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= filled ? tone.bar : "bg-slate-200",
            )}
          />
        ))}
        <span className={cn("ml-2 min-w-[5.5rem] text-right text-[11px] font-medium", tone.text)}>
          {strength.label}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-0.5 text-[11px] text-slate-500 sm:grid-cols-2">
        {strength.rules.map((r) => (
          <li key={r.id} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-3 w-3 items-center justify-center rounded-full text-[8px]",
                r.pass ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400",
              )}
            >
              {r.pass ? "✓" : ""}
            </span>
            <span className={r.pass ? "text-slate-700" : "text-slate-400"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
