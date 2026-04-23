"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import { formatPKR } from "@shopos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { closeDayAction } from "./actions";

export function CloseDayForm({
  day,
  expectedCash,
}: {
  day: string;
  expectedCash: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actual, setActual] = useState<number>(expectedCash);
  const [notes, setNotes] = useState("");
  const variance = useMemo(() => Math.round((actual - expectedCash) * 100) / 100, [actual, expectedCash]);
  const needsNote = Math.abs(variance) > 0.009;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (needsNote && !notes.trim()) {
      setError("Variance isn't zero — please add a note explaining it.");
      return;
    }
    startTransition(async () => {
      const res = await closeDayAction({
        closingDate: day,
        actualCash: actual,
        notes: notes,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/closing/${res.data.date}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <Field id="actual" label="Actual cash counted" hint="Count the drawer, type the total.">
        <Input
          id="actual"
          type="number"
          inputMode="decimal"
          min={0}
          value={actual}
          onChange={(e) => setActual(Math.max(0, Number(e.target.value) || 0))}
          className="h-12 text-lg"
          required
        />
      </Field>

      <div className={`rounded-md border p-3 text-sm ${
        variance === 0
          ? "border-slate-200 bg-slate-50 text-slate-700"
          : variance < 0
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-indigo-200 bg-indigo-50 text-indigo-900"
      }`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {variance === 0 ? "Balanced" : variance < 0 ? "Short" : "Over"}
          </span>
          <span className="tabular-nums">
            {variance > 0 ? "+" : ""}{formatPKR(variance)}
          </span>
        </div>
        {needsNote ? (
          <p className="mt-1 text-xs">
            Non-zero variance — capture why so next week you're not guessing.
          </p>
        ) : null}
      </div>

      <Field id="notes" label="Notes" hint={needsNote ? "Required when variance isn't zero" : "Optional"}>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          placeholder="e.g. missed Rs. 500 expense entry — added tomorrow"
        />
      </Field>

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
        {pending ? "Closing…" : "Close day"}
      </Button>
      <p className="text-xs text-slate-400">
        Once closed, the day&apos;s ledger freezes. Reversals require super-admin.
      </p>
    </form>
  );
}
