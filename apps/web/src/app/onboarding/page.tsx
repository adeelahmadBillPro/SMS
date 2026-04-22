"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { onboardingAction } from "./action";

export default function OnboardingPage() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fbr, setFbr] = useState<"yes" | "no">("no");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await onboardingAction({
        address: String(fd.get("address") ?? ""),
        ntn: String(fd.get("ntn") ?? ""),
        gst: String(fd.get("gst") ?? ""),
        fbrRegistered: fbr,
        openingCash: String(fd.get("openingCash") ?? "0"),
        openingBank: String(fd.get("openingBank") ?? "0"),
      });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.33, 1, 0.68, 1] }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Setup · 1 of 1</p>
          <h1 className="text-2xl font-semibold text-slate-900">Set up your shop</h1>
          <p className="text-sm text-slate-600">
            Takes a minute. You can change everything later in Settings.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Field id="address" label="Shop address" hint="Street, area, city">
              <Input id="address" name="address" autoComplete="street-address" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field id="ntn" label="NTN" hint="Optional">
                <Input id="ntn" name="ntn" />
              </Field>
              <Field id="gst" label="GST" hint="Optional">
                <Input id="gst" name="gst" />
              </Field>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium text-slate-700">Are you FBR-registered?</p>
            <div className="grid grid-cols-2 gap-3">
              <FbrOption value="no" selected={fbr} onSelect={setFbr} label="Not yet" hint="Default tax 0%" />
              <FbrOption value="yes" selected={fbr} onSelect={setFbr} label="Yes, registered" hint="Default tax 18%" />
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium text-slate-700">Opening balances</p>
            <div className="grid grid-cols-2 gap-4">
              <Field id="openingCash" label="Cash in drawer" hint="PKR">
                <Input id="openingCash" name="openingCash" type="number" inputMode="numeric" min={0} defaultValue={0} />
              </Field>
              <Field id="openingBank" label="Bank balance" hint="PKR">
                <Input id="openingBank" name="openingBank" type="number" inputMode="numeric" min={0} defaultValue={0} />
              </Field>
            </div>
          </div>

          {error ? (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: [0, -4, 4, -2, 2, 0] }}
              transition={{ duration: 0.32 }}
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </motion.div>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Finish setup"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

function FbrOption({
  value,
  selected,
  onSelect,
  label,
  hint,
}: {
  value: "yes" | "no";
  selected: "yes" | "no";
  onSelect: (v: "yes" | "no") => void;
  label: string;
  hint: string;
}) {
  const isActive = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-lg border p-3.5 text-left transition-all duration-120 ${
        isActive
          ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className={`text-sm font-medium ${isActive ? "text-indigo-900" : "text-slate-900"}`}>{label}</div>
      <div className={`mt-0.5 text-xs ${isActive ? "text-indigo-700" : "text-slate-500"}`}>{hint}</div>
    </button>
  );
}
