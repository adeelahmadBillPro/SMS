"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { recordCustomerPaymentAction } from "../actions";

const METHODS = ["CASH", "BANK", "JAZZCASH", "EASYPAISA", "CARD", "CHEQUE"] as const;

export function RecordCustomerPaymentForm({
  customerId,
  defaultAmount,
}: {
  customerId: string;
  defaultAmount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("CASH");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount") ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      const res = await recordCustomerPaymentAction({
        customerId,
        method,
        amount,
        note: String(fd.get("note") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-slate-700">Method</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                method === m
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {m === "JAZZCASH" ? "JazzCash" : m === "EASYPAISA" ? "Easypaisa" : m[0] + m.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <Field id="amount" label="Amount (PKR)" hint="Pre-filled with the full outstanding">
        <Input id="amount" name="amount" inputMode="decimal" defaultValue={defaultAmount || ""} />
      </Field>
      <Field id="note" label="Note" hint="Optional">
        <Input id="note" name="note" placeholder="e.g. part payment Feb 5" />
      </Field>
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      <Button type="submit" size="md" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </form>
  );
}
