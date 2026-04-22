"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { adjustStockAction } from "../actions";

export function AdjustStockForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<"ADJUSTMENT" | "DAMAGE">("ADJUSTMENT");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const qtyDelta = Number(fd.get("qtyDelta") ?? 0);
    if (!Number.isFinite(qtyDelta) || qtyDelta === 0) {
      setError("Enter a non-zero quantity (use - for removals)");
      return;
    }
    startTransition(async () => {
      const res = await adjustStockAction({
        productId,
        qtyDelta,
        reason,
        note: String(fd.get("note") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid grid-cols-2 gap-3">
        <Field id="qtyDelta" label="Qty change" hint="Negative to remove">
          <Input id="qtyDelta" name="qtyDelta" type="number" inputMode="numeric" step={1} />
        </Field>
        <div>
          <p className="text-sm font-medium text-slate-700">Reason</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["ADJUSTMENT", "DAMAGE"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  reason === r
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {r === "ADJUSTMENT" ? "Count fix" : "Damage"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Field id="note" label="Note" hint="Optional — why?">
        <Input id="note" name="note" />
      </Field>
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      ) : null}
      <div className="flex items-center justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Apply adjustment"}
        </Button>
      </div>
    </form>
  );
}
