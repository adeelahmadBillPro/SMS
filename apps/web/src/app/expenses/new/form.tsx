"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Closing } from "@shopos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { createExpenseAction } from "../actions";

export function NewExpenseForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>(Closing.EXPENSE_CATEGORIES[0]);
  const [paidViaCash, setPaidViaCash] = useState(true);
  const [custom, setCustom] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createExpenseAction({
        category: custom ? String(fd.get("customCategory") ?? "") : category,
        amount: String(fd.get("amount") ?? "0"),
        paidViaCash,
        note: String(fd.get("note") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/expenses");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Category</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Closing.EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setCategory(c); setCustom(false); }}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                !custom && category === c
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustom(true)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              custom
                ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Custom…
          </button>
        </div>
        {custom ? (
          <Input name="customCategory" placeholder="Category name" required autoFocus />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="amount" label="Amount (PKR)">
          <Input id="amount" name="amount" inputMode="decimal" required autoFocus={!custom} />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700">Paid via</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaidViaCash(true)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${paidViaCash ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaidViaCash(false)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${!paidViaCash ? "border-indigo-600 bg-indigo-50 text-indigo-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              Bank
            </button>
          </div>
        </div>
      </div>

      <Field id="note" label="Note" hint="Optional">
        <Input id="note" name="note" placeholder="e.g. Jan rent, monthly" />
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

      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Record expense"}
        </Button>
      </div>
    </form>
  );
}
