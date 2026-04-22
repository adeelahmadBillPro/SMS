"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Khata, formatPKR } from "@shopos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { posSearchAction } from "@/app/pos/product-search";
import type { PosProductHit } from "@/app/pos/queries";
import { createPurchaseAction } from "../actions";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
}

interface Line {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
  taxRate: number;
  hasImei: boolean;
  hasSerial: boolean;
  identifiers: string[];
}

type PaymentMethod = "CASH" | "BANK" | "JAZZCASH" | "EASYPAISA" | "CARD" | "CHEQUE";
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash", BANK: "Bank", JAZZCASH: "JazzCash", EASYPAISA: "Easypaisa", CARD: "Card", CHEQUE: "Cheque",
};

export function NewPurchaseScreen({
  suppliers,
  initialSupplierId,
}: {
  suppliers: Supplier[];
  initialSupplierId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState<string>(
    initialSupplierId && suppliers.some((s) => s.id === initialSupplierId)
      ? initialSupplierId
      : suppliers[0]?.id ?? "",
  );
  const [invoiceNo, setInvoiceNo] = useState("");

  // ---- Search + add line
  const searchRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PosProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await posSearchAction(q));
      } finally {
        setSearching(false);
      }
    }, 120);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q]);

  const [lines, setLines] = useState<Line[]>([]);
  function addProduct(hit: PosProductHit) {
    setLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: hit.id,
        variantId: null,
        productName: hit.name,
        sku: hit.sku,
        qty: 1,
        unitCost: hit.cost,
        taxRate: hit.taxRate,
        hasImei: hit.hasImei,
        hasSerial: hit.hasSerial,
        identifiers: hit.hasImei || hit.hasSerial ? [""] : [],
      },
    ]);
    setQ("");
    setResults([]);
    searchRef.current?.focus();
  }
  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }
  function setQty(id: string, qty: number) {
    if (qty < 1) return removeLine(id);
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    if (line.hasImei || line.hasSerial) {
      const next = qty > line.identifiers.length
        ? [...line.identifiers, ...Array.from({ length: qty - line.identifiers.length }, () => "")]
        : line.identifiers.slice(0, qty);
      updateLine(id, { qty, identifiers: next });
    } else {
      updateLine(id, { qty });
    }
  }

  const totals = useMemo(
    () =>
      Khata.computePurchaseTotals(
        lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          productName: l.productName,
          sku: l.sku,
          qty: l.qty,
          unitCost: l.unitCost,
          taxRate: l.taxRate,
        })),
      ),
    [lines],
  );

  // ---- Payments
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([
    { method: "CASH", amount: 0 },
  ]);
  const paidSum = payments.reduce((a, p) => a + (Number.isFinite(p.amount) ? p.amount : 0), 0);
  const balance = Math.max(0, totals.total - paidSum);

  useEffect(() => {
    setPayments((prev) => {
      if (prev.length === 0) return [{ method: "CASH", amount: 0 }];
      const next = [...prev];
      const others = prev.slice(1).reduce((a, p) => a + p.amount, 0);
      // auto-fill first line with total (cashier can clear to switch to credit).
      next[0] = { ...prev[0]!, amount: Math.max(0, Math.round((totals.total - others) * 100) / 100) };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  const canSave =
    supplierId &&
    lines.length > 0 &&
    !pending &&
    lines.every((l) =>
      !(l.hasImei || l.hasSerial)
        ? true
        : l.identifiers.length === l.qty && l.identifiers.every((s) => s.trim().length > 0),
    );

  function onSave() {
    setError(null);
    if (!canSave) return;
    const clientUuid = crypto.randomUUID();
    startTransition(async () => {
      const res = await createPurchaseAction({
        clientUuid,
        supplierId,
        invoiceNo,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId ?? undefined,
          qty: l.qty,
          unitCost: l.unitCost,
          taxRate: l.taxRate,
          identifiers: l.hasImei || l.hasSerial ? l.identifiers.map((s) => s.trim()) : undefined,
        })),
        payments: payments.filter((p) => p.amount > 0),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/purchases/${res.data.id}`);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,22rem]">
      <section className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <Field id="supplier" label="Supplier">
            <select
              id="supplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              required
            >
              {suppliers.length === 0 ? <option value="">No suppliers — add one first</option> : null}
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field id="invoiceNo" label="Supplier invoice #" hint="Optional">
            <Input id="invoiceNo" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
          </Field>
        </div>

        <div className="relative">
          <Input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Add product — search name / SKU / barcode"
            className="h-12"
          />
          <AnimatePresence>
            {results.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              >
                <ul className="max-h-80 overflow-y-auto">
                  {results.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(h)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{h.name}</p>
                          <p className="truncate text-xs text-slate-500 font-mono">{h.sku}</p>
                        </div>
                        <span className="text-xs text-slate-500">Cost {formatPKR(h.cost)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {searching ? (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              Searching…
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {lines.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Search above to add items to this purchase.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Unit cost</th>
                  <th className="px-4 py-3 text-right">Tax %</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, i) => (
                  <PurchaseRow
                    key={line.id}
                    line={line}
                    lineTotal={totals.lines[i]?.lineTotal ?? 0}
                    onQty={(q2) => setQty(line.id, q2)}
                    onUnitCost={(v) => updateLine(line.id, { unitCost: v })}
                    onTax={(v) => updateLine(line.id, { taxRate: v })}
                    onIdentifier={(idx, v) => {
                      const next = [...line.identifiers];
                      next[idx] = v;
                      updateLine(line.id, { identifiers: next });
                    }}
                    onRemove={() => removeLine(line.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 text-sm">
          <Row label="Subtotal" value={formatPKR(totals.subtotal)} />
          <Row label="Tax" value={formatPKR(totals.tax)} />
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base">
            <span className="font-medium text-slate-900">Total</span>
            <span className="tabular-nums text-xl font-semibold text-slate-900">{formatPKR(totals.total)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Paying now</p>
          {payments.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={p.method}
                onChange={(e) =>
                  setPayments((prev) => {
                    const next = [...prev];
                    next[i] = { ...prev[i]!, method: e.target.value as PaymentMethod };
                    return next;
                  })
                }
                className="h-10 w-32 rounded-md border border-slate-200 bg-white px-2 text-sm"
              >
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={p.amount || ""}
                onChange={(e) =>
                  setPayments((prev) => {
                    const next = [...prev];
                    next[i] = { ...prev[i]!, amount: Math.max(0, Number(e.target.value) || 0) };
                    return next;
                  })
                }
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-right tabular-nums text-sm"
                placeholder="0"
              />
              {payments.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setPayments((prev) => prev.filter((_, k) => k !== i))}
                  className="text-xs text-slate-400 hover:text-rose-600"
                  aria-label="Remove payment"
                >
                  ✕
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPayments((p) => [...p, { method: "CASH", amount: 0 }])}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Split payment
          </button>
          <div className="border-t border-slate-200 pt-3 text-sm">
            {balance > 0 ? (
              <p className="text-xs text-amber-800">
                Owe supplier <span className="tabular-nums font-medium">{formatPKR(balance)}</span> (credit)
              </p>
            ) : (
              <p className="text-xs text-slate-400">Balanced</p>
            )}
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

        <Button onClick={onSave} disabled={!canSave} size="lg" className="w-full">
          {pending ? "Saving…" : `Save purchase · ${formatPKR(totals.total)}`}
        </Button>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function PurchaseRow({
  line,
  lineTotal,
  onQty,
  onUnitCost,
  onTax,
  onIdentifier,
  onRemove,
}: {
  line: Line;
  lineTotal: number;
  onQty: (q: number) => void;
  onUnitCost: (v: number) => void;
  onTax: (v: number) => void;
  onIdentifier: (idx: number, v: string) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <tr>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">{line.productName}</p>
          <p className="text-xs text-slate-500 font-mono">{line.sku}</p>
        </td>
        <td className="px-4 py-3 text-center">
          <input
            type="number"
            min={1}
            value={line.qty}
            onChange={(e) => onQty(Math.max(1, Number(e.target.value) || 1))}
            className="h-8 w-16 rounded border border-slate-200 bg-white px-1 text-center text-sm"
          />
        </td>
        <td className="px-4 py-3 text-right">
          <input
            type="number"
            min={0}
            value={line.unitCost}
            onChange={(e) => onUnitCost(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-24 rounded border border-slate-200 bg-white px-2 text-right tabular-nums text-sm"
          />
        </td>
        <td className="px-4 py-3 text-right">
          <input
            type="number"
            min={0}
            max={100}
            value={line.taxRate || ""}
            onChange={(e) => onTax(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-16 rounded border border-slate-200 bg-white px-2 text-right tabular-nums text-sm"
            placeholder="0"
          />
        </td>
        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
          {formatPKR(lineTotal)}
        </td>
        <td className="px-2 py-3 text-center">
          <button type="button" onClick={onRemove} className="text-slate-300 hover:text-rose-600" aria-label="Remove">
            ✕
          </button>
        </td>
      </tr>
      {(line.hasImei || line.hasSerial) ? (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-2">
            <p className="mb-1.5 text-xs font-medium text-slate-600">
              {line.hasImei ? "IMEIs" : "Serials"} ({line.identifiers.length}/{line.qty})
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {line.identifiers.map((ident, idx) => (
                <input
                  key={idx}
                  value={ident}
                  onChange={(e) => onIdentifier(idx, e.target.value)}
                  className="h-8 rounded border border-slate-200 bg-white px-2 font-mono text-xs"
                  placeholder={line.hasImei ? "IMEI" : "Serial"}
                />
              ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
