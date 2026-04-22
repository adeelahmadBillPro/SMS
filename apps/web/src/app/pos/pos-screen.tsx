"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Billing, formatPKR } from "@shopos/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerRow } from "@/app/customers/queries";
import type { PosProductHit } from "./queries";
import { createSaleAction } from "./actions";
import { posSearchAction } from "./product-search";
import { quickAddCustomerAction } from "@/app/customers/actions";

interface CartLine {
  id: string; // local react key
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  discount: number;
  hasImei: boolean;
  hasSerial: boolean;
  identifiers: string[];
  availableQty: number;
}

type PaymentMethod = "CASH" | "BANK" | "JAZZCASH" | "EASYPAISA" | "CARD" | "CHEQUE";
const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  CARD: "Card",
  CHEQUE: "Cheque",
};

export function PosScreen({ initialCustomers }: { initialCustomers: CustomerRow[] }) {
  const router = useRouter();
  const [pendingCommit, startCommit] = useTransition();

  // ---- Cart + totals ------------------------------------------------------
  const [cart, setCart] = useState<CartLine[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);

  const totals = useMemo(() => {
    const domainLines = cart.map((l) => ({
      productId: l.productId,
      variantId: l.variantId,
      productName: l.productName,
      sku: l.sku,
      qty: l.qty,
      unitPrice: l.unitPrice,
      unitCost: l.unitCost,
      discount: l.discount,
      taxRate: l.taxRate,
    }));
    return Billing.computeCartTotals(domainLines, billDiscount);
  }, [cart, billDiscount]);

  // ---- Search ------------------------------------------------------------
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PosProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeHit, setActiveHit] = useState(0);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setActiveHit(0);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const hits = await posSearchAction(searchQuery);
        setSearchResults(hits);
        setActiveHit(0);
      } finally {
        setSearching(false);
      }
    }, 120);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const addToCart = useCallback((hit: PosProductHit, variantId: string | null = null) => {
    const variant = variantId ? hit.variants.find((v) => v.id === variantId) : null;
    const unitPrice = variant?.priceOverride ?? hit.price;
    const unitCost = variant?.costOverride ?? hit.cost;
    const availableQty = variant ? variant.currentQty : hit.currentQty;
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.productId === hit.id && l.variantId === variantId && !l.hasImei && !l.hasSerial,
      );
      if (existingIdx !== -1 && !hit.hasImei && !hit.hasSerial) {
        const next = [...prev];
        const e = next[existingIdx]!;
        next[existingIdx] = { ...e, qty: e.qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: `${hit.id}-${variantId ?? "_"}-${crypto.randomUUID()}`,
          productId: hit.id,
          variantId,
          productName: variant ? `${hit.name} (${[variant.color, variant.storage, variant.ram].filter(Boolean).join(" · ")})` : hit.name,
          sku: hit.sku,
          qty: 1,
          unitPrice,
          unitCost,
          taxRate: hit.taxRate,
          discount: 0,
          hasImei: hit.hasImei,
          hasSerial: hit.hasSerial,
          identifiers: hit.hasImei || hit.hasSerial ? [""] : [],
          availableQty,
        },
      ];
    });
    setSearchQuery("");
    setSearchResults([]);
    searchRef.current?.focus();
  }, []);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveHit((h) => Math.min(h + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveHit((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && searchResults[activeHit]) {
      e.preventDefault();
      const hit = searchResults[activeHit]!;
      // If the product has no variants with IMEI collision, default add.
      addToCart(hit, null);
    } else if (e.key === "Escape") {
      setSearchQuery("");
      setSearchResults([]);
    }
  }

  // ---- Cart line edits ---------------------------------------------------
  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }
  function setQty(id: string, qty: number) {
    if (qty < 1) return removeLine(id);
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    if (line.hasImei || line.hasSerial) {
      const current = line.identifiers;
      const next = qty > current.length
        ? [...current, ...Array.from({ length: qty - current.length }, () => "")]
        : current.slice(0, qty);
      updateLine(id, { qty, identifiers: next });
    } else {
      updateLine(id, { qty });
    }
  }

  // ---- Customer ----------------------------------------------------------
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  // ---- Payments ----------------------------------------------------------
  type PaymentLine = { method: PaymentMethod; amount: number };
  const [payments, setPayments] = useState<PaymentLine[]>([{ method: "CASH", amount: 0 }]);
  const [creditAmount, setCreditAmount] = useState(0);
  const paidSum = useMemo(() => payments.reduce((a, p) => a + (Number.isFinite(p.amount) ? p.amount : 0), 0), [payments]);
  const shortfall = Math.max(0, totals.total - paidSum - creditAmount);
  const change = Math.max(0, paidSum + creditAmount - totals.total);

  // Auto-balance: when cart total changes, seed the first payment with the remaining amount.
  useEffect(() => {
    setPayments((prev) => {
      if (prev.length === 0) return [{ method: "CASH", amount: totals.total }];
      const next = [...prev];
      // Only auto-fill the first line if cashier hasn't touched it
      // (heuristic: all other payment amounts are 0 and no credit set).
      const others = prev.slice(1).reduce((a, p) => a + p.amount, 0);
      const candidate = totals.total - others - creditAmount;
      next[0] = { ...prev[0]!, amount: Math.max(0, Math.round(candidate * 100) / 100) };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.total]);

  function addPaymentLine() {
    setPayments((p) => [...p, { method: "CASH", amount: 0 }]);
  }

  // ---- Commit ------------------------------------------------------------
  const [error, setError] = useState<string | null>(null);
  const canCommit =
    cart.length > 0 &&
    shortfall === 0 &&
    !pendingCommit &&
    cart.every((l) =>
      !(l.hasImei || l.hasSerial)
        ? true
        : l.identifiers.length === l.qty && l.identifiers.every((s) => s.trim().length > 0),
    );

  function onCommit() {
    setError(null);
    if (!canCommit) return;
    const clientUuid = crypto.randomUUID();
    const input = {
      clientUuid,
      customerId: customerId ?? undefined,
      cart: cart.map((l) => ({
        productId: l.productId,
        variantId: l.variantId ?? undefined,
        qty: l.qty,
        unitPrice: l.unitPrice,
        discount: l.discount,
        taxRate: l.taxRate,
        identifiers: l.hasImei || l.hasSerial ? l.identifiers.map((s) => s.trim()) : undefined,
      })),
      billDiscount,
      payments: payments.filter((p) => p.amount > 0),
      creditAmount,
    };
    startCommit(async () => {
      const res = await createSaleAction(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.data.receiptUrl);
    });
  }

  // Keyboard shortcut: `/` focuses search (unless typing in a field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,24rem]">
      {/* ---- Left: search + cart ---------------------------------------- */}
      <section className="space-y-4">
        <div className="relative">
          <Input
            ref={searchRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Scan barcode or search name / SKU / brand — press / to focus"
            className="h-12 text-base"
            aria-label="Search products"
          />
          <AnimatePresence>
            {searchResults.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              >
                <ul className="max-h-80 overflow-y-auto">
                  {searchResults.map((h, i) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => addToCart(h, null)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === activeHit ? "bg-indigo-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{h.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            <span className="font-mono">{h.sku}</span>
                            {h.brand ? <span> · {h.brand}</span> : null}
                            {h.model ? <span> · {h.model}</span> : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-right text-xs">
                          <span className={h.currentQty <= 0 ? "font-medium text-rose-700" : "text-slate-500"}>
                            {h.currentQty} in stock
                          </span>
                          <span className="tabular-nums font-medium text-slate-900">{formatPKR(h.price)}</span>
                        </div>
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
          {cart.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700">Cart is empty</p>
              <p className="mt-1">Scan or search to add a product. Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-xs">/</kbd> to focus search.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                  <th className="w-10 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((line, i) => (
                  <CartRow
                    key={line.id}
                    line={line}
                    lineTotal={totals.lines[i]?.lineTotal ?? 0}
                    onQty={(q) => setQty(line.id, q)}
                    onUnitPrice={(v) => updateLine(line.id, { unitPrice: v })}
                    onDiscount={(v) => updateLine(line.id, { discount: v })}
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

      {/* ---- Right: customer + payment panel ---------------------------- */}
      <aside className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setCustomerPickerOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            aria-expanded={customerPickerOpen}
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Customer</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">
                {selectedCustomer ? selectedCustomer.name : "Walk-in"}
              </p>
              {selectedCustomer?.outstanding ? (
                <p className="mt-0.5 text-xs text-rose-700">
                  Owes {formatPKR(selectedCustomer.outstanding)} · Limit {formatPKR(selectedCustomer.creditLimit)}
                </p>
              ) : null}
            </div>
            <span className="text-xs text-slate-400">{customerPickerOpen ? "Close" : "Change"}</span>
          </button>
          {customerPickerOpen ? (
            <CustomerPicker
              customers={customers}
              onPick={(c) => {
                setCustomerId(c?.id ?? null);
                setCustomerPickerOpen(false);
              }}
              onAdded={(c) => {
                setCustomers((prev) => [{ ...c, outstanding: 0 }, ...prev]);
                setCustomerId(c.id);
                setCustomerPickerOpen(false);
              }}
            />
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="tabular-nums text-slate-900">{formatPKR(totals.subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Tax</span>
            <span className="tabular-nums text-slate-900">{formatPKR(totals.tax)}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-600">Bill discount</span>
            <input
              type="number"
              inputMode="decimal"
              step={1}
              min={0}
              value={billDiscount || ""}
              onChange={(e) => setBillDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="h-8 w-28 rounded-md border border-slate-200 bg-white px-2 text-right tabular-nums text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              placeholder="0"
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base">
            <span className="font-medium text-slate-900">Total</span>
            <span className="tabular-nums text-xl font-semibold text-slate-900">
              {formatPKR(totals.total)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Payment</p>
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
                className="h-10 w-32 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={p.amount || ""}
                onChange={(e) =>
                  setPayments((prev) => {
                    const next = [...prev];
                    next[i] = { ...prev[i]!, amount: Math.max(0, Number(e.target.value) || 0) };
                    return next;
                  })
                }
                className="h-10 flex-1 rounded-md border border-slate-200 bg-white px-3 text-right tabular-nums text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
            onClick={addPaymentLine}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Split payment
          </button>

          <div className="border-t border-slate-200 pt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="credit" className="text-slate-600">Credit (Udhaar)</label>
              <input
                id="credit"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={creditAmount || ""}
                onChange={(e) => setCreditAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-28 rounded-md border border-slate-200 bg-white px-2 text-right tabular-nums text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder="0"
              />
            </div>
            {creditAmount > 0 && !customerId ? (
              <p className="text-xs text-rose-700">Credit sale needs a customer.</p>
            ) : null}
            {shortfall > 0 ? (
              <p className="text-xs text-amber-700">
                Short by <span className="tabular-nums font-medium">{formatPKR(shortfall)}</span>
              </p>
            ) : change > 0 ? (
              <p className="text-xs text-indigo-700">
                Change: <span className="tabular-nums font-medium">{formatPKR(change)}</span>
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

        <Button
          onClick={onCommit}
          disabled={!canCommit}
          size="lg"
          className="w-full"
        >
          {pendingCommit ? "Ringing up…" : `Complete sale · ${formatPKR(totals.total)}`}
        </Button>
      </aside>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Cart row
// ----------------------------------------------------------------------------

function CartRow({
  line,
  lineTotal,
  onQty,
  onUnitPrice,
  onDiscount,
  onIdentifier,
  onRemove,
}: {
  line: CartLine;
  lineTotal: number;
  onQty: (q: number) => void;
  onUnitPrice: (v: number) => void;
  onDiscount: (v: number) => void;
  onIdentifier: (idx: number, v: string) => void;
  onRemove: () => void;
}) {
  const oversold = line.qty > line.availableQty;
  return (
    <>
      <tr className={oversold ? "bg-amber-50" : ""}>
        <td className="px-4 py-3">
          <p className="font-medium text-slate-900">{line.productName}</p>
          <p className="text-xs text-slate-500 font-mono">{line.sku}</p>
          {oversold ? (
            <p className="mt-0.5 text-xs text-amber-800">
              Only {line.availableQty} in stock — check before completing.
            </p>
          ) : null}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onQty(line.qty - 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Decrease qty"
            >
              –
            </button>
            <input
              type="number"
              min={1}
              step={1}
              value={line.qty}
              onChange={(e) => onQty(Math.max(1, Number(e.target.value) || 1))}
              className="h-7 w-14 rounded border border-slate-200 bg-white px-1 text-center text-sm"
            />
            <button
              type="button"
              onClick={() => onQty(line.qty + 1)}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Increase qty"
            >
              +
            </button>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={line.unitPrice}
            onChange={(e) => onUnitPrice(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-24 rounded border border-slate-200 bg-white px-2 text-right tabular-nums text-sm"
          />
        </td>
        <td className="px-4 py-3 text-right">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            value={line.discount || ""}
            onChange={(e) => onDiscount(Math.max(0, Number(e.target.value) || 0))}
            className="h-8 w-20 rounded border border-slate-200 bg-white px-2 text-right tabular-nums text-sm"
            placeholder="0"
          />
        </td>
        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
          {formatPKR(lineTotal)}
        </td>
        <td className="px-2 py-3 text-center">
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-300 hover:text-rose-600"
            aria-label="Remove line"
          >
            ✕
          </button>
        </td>
      </tr>
      {(line.hasImei || line.hasSerial) ? (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-4 py-2">
            <p className="text-xs font-medium text-slate-600 mb-1.5">
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

// ----------------------------------------------------------------------------
// Customer picker (inline search + quick-add)
// ----------------------------------------------------------------------------

function CustomerPicker({
  customers,
  onPick,
  onAdded,
}: {
  customers: CustomerRow[];
  onPick: (c: CustomerRow | null) => void;
  onAdded: (c: { id: string; name: string; creditLimit: number; phone: string | null; cnic: string | null }) => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"search" | "new">("search");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return customers.slice(0, 20);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) ||
          (c.phone ?? "").includes(needle) ||
          (c.cnic ?? "").includes(needle),
      )
      .slice(0, 20);
  }, [customers, q]);

  const [newError, setNewError] = useState<string | null>(null);
  const [newPending, startNew] = useTransition();
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLimit, setNewLimit] = useState(0);

  function addCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNewError(null);
    startNew(async () => {
      const res = await quickAddCustomerAction({
        name: newName,
        phone: newPhone,
        creditLimit: String(newLimit),
      });
      if (!res.ok) {
        setNewError(res.error);
        return;
      }
      onAdded({
        id: res.data.id,
        name: res.data.name,
        phone: newPhone || null,
        cnic: null,
        creditLimit: newLimit,
      });
    });
  }

  return (
    <div className="border-t border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "search" ? "primary" : "secondary"}
          onClick={() => setMode("search")}
        >
          Search
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "primary" : "secondary"}
          onClick={() => setMode("new")}
        >
          Quick-add
        </Button>
        <button
          type="button"
          onClick={() => onPick(null)}
          className="ml-auto text-xs text-slate-500 hover:text-slate-900"
        >
          Use walk-in
        </button>
      </div>

      {mode === "search" ? (
        <>
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer…"
          />
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="text-xs text-slate-500">No match.</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.phone ?? "no phone"}
                        {c.outstanding > 0 ? <span className="ml-2 text-rose-700">owes {formatPKR(c.outstanding)}</span> : null}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">Limit {formatPKR(c.creditLimit)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <form onSubmit={addCustomer} className="space-y-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            required
          />
          <Input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Phone (optional)"
            inputMode="tel"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Credit limit</label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              value={newLimit || ""}
              onChange={(e) => setNewLimit(Math.max(0, Number(e.target.value) || 0))}
              className="h-9 flex-1"
            />
          </div>
          {newError ? (
            <p className="text-xs text-rose-700">{newError}</p>
          ) : null}
          <Button type="submit" size="sm" className="w-full" disabled={newPending}>
            {newPending ? "Adding…" : "Add customer"}
          </Button>
        </form>
      )}
    </div>
  );
}
