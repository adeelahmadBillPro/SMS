"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { receiveStockAction } from "../../actions";

interface Props {
  productId: string;
  hasImei: boolean;
  hasSerial: boolean;
  defaultCost: number;
  variants: Array<{ id: string; label: string }>;
}

export function ReceiveStockForm({ productId, hasImei, hasSerial, defaultCost, variants }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | "">("");
  const [qty, setQty] = useState<number>(1);
  const [serialBlob, setSerialBlob] = useState("");

  const serialized = hasImei || hasSerial;
  const identifiers = useMemo(
    () =>
      serialBlob
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean),
    [serialBlob],
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (serialized && identifiers.length !== qty) {
      setError(
        `Qty is ${qty} but you entered ${identifiers.length} ${
          hasImei ? "IMEIs" : "serials"
        }. They must match.`,
      );
      return;
    }

    const fd = new FormData(e.currentTarget);
    const input: Record<string, unknown> = {
      productId,
      variantId: variantId || undefined,
      qty,
      unitCost: String(fd.get("unitCost") ?? defaultCost),
      reason: "PURCHASE",
    };
    if (hasImei) input.imeis = identifiers;
    if (hasSerial) input.serials = identifiers;

    startTransition(async () => {
      const res = await receiveStockAction(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/inventory/${productId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {variants.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-slate-700">Variant</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setVariantId("")}
              className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                variantId === ""
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              No variant
            </button>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  variantId === v.id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <Field id="qty" label="Qty" hint="Units received">
          <Input
            id="qty"
            name="qty"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            required
          />
        </Field>
        <Field id="unitCost" label="Unit cost (PKR)" hint="Affects stock valuation">
          <Input id="unitCost" name="unitCost" inputMode="decimal" defaultValue={defaultCost} />
        </Field>
      </div>

      {serialized ? (
        <Field
          id="identifiers"
          label={hasImei ? "IMEIs" : "Serials"}
          hint={`Paste one per line, or comma-separate. ${identifiers.length}/${qty} entered.`}
        >
          <textarea
            id="identifiers"
            value={serialBlob}
            onChange={(e) => setSerialBlob(e.target.value)}
            rows={Math.max(4, Math.min(10, qty))}
            className="block w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            placeholder={hasImei ? "356938035643809" : "SN-0001"}
          />
        </Field>
      ) : null}

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
          {pending ? "Saving…" : "Receive stock"}
        </Button>
      </div>
    </form>
  );
}
