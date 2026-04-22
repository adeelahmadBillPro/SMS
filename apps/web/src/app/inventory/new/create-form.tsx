"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { createProductAction } from "../actions";

const CATEGORIES = [
  { value: "MOBILE", label: "Mobile", serialized: true },
  { value: "LAPTOP", label: "Laptop", serialized: true },
  { value: "ACCESSORY", label: "Accessory", serialized: false },
  { value: "CHARGER", label: "Charger", serialized: false },
  { value: "COVER", label: "Cover", serialized: false },
  { value: "SIM", label: "SIM", serialized: false },
  { value: "OTHER", label: "Other", serialized: false },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export function CreateProductForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [category, setCategory] = useState<Category>("MOBILE");
  const [hasImei, setHasImei] = useState(true);
  const [hasSerial, setHasSerial] = useState(false);
  const [hasWarranty, setHasWarranty] = useState(false);

  const isSerialized = category === "MOBILE" || category === "LAPTOP";

  function onChangeCategory(v: Category) {
    setCategory(v);
    if (v === "MOBILE") {
      setHasImei(true);
      setHasSerial(false);
    } else if (v === "LAPTOP") {
      setHasImei(false);
      setHasSerial(true);
    } else {
      setHasImei(false);
      setHasSerial(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const input = {
      sku: String(fd.get("sku") ?? ""),
      name: String(fd.get("name") ?? ""),
      category,
      brand: String(fd.get("brand") ?? ""),
      model: String(fd.get("model") ?? ""),
      unit: String(fd.get("unit") ?? "pcs"),
      cost: String(fd.get("cost") ?? "0"),
      price: String(fd.get("price") ?? "0"),
      taxRate: String(fd.get("taxRate") ?? "0"),
      barcode: String(fd.get("barcode") ?? ""),
      hasImei,
      hasSerial,
      hasWarranty,
      lowStockThreshold: String(fd.get("lowStockThreshold") ?? "0"),
      reorderQty: String(fd.get("reorderQty") ?? "0"),
      leadTimeDays: String(fd.get("leadTimeDays") ?? "7"),
    };
    startTransition(async () => {
      const res = await createProductAction(input);
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      router.push(`/inventory/${res.data.id}`);
    });
  }

  const fe = (path: string) => fieldErrors[path]?.[0];

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" error={fe("name")}>
          <Input id="name" name="name" required autoFocus placeholder="e.g. Redmi 13C" />
        </Field>
        <Field id="sku" label="SKU" hint="Unique in your shop" error={fe("sku")}>
          <Input id="sku" name="sku" required placeholder="PHN-RED13C" />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Category</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChangeCategory(c.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                category === c.value
                  ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="brand" label="Brand" hint="Optional">
          <Input id="brand" name="brand" placeholder="Xiaomi" />
        </Field>
        <Field id="model" label="Model" hint="Optional">
          <Input id="model" name="model" placeholder="13C 128GB" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="cost" label="Cost (PKR)" error={fe("cost")}>
          <Input id="cost" name="cost" inputMode="decimal" defaultValue="0" />
        </Field>
        <Field id="price" label="Price (PKR)" error={fe("price")}>
          <Input id="price" name="price" inputMode="decimal" defaultValue="0" />
        </Field>
        <Field id="taxRate" label="Tax %" hint="0 or 18 usually">
          <Input id="taxRate" name="taxRate" inputMode="decimal" defaultValue="0" />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="barcode" label="Barcode" hint="Optional, scan later">
          <Input id="barcode" name="barcode" />
        </Field>
        <Field id="unit" label="Unit" hint="pcs, pair, box…">
          <Input id="unit" name="unit" defaultValue="pcs" />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Per-unit tracking</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <CheckPill checked={hasImei} onChange={setHasImei} label="Has IMEI" hint="Mobiles" />
          <CheckPill checked={hasSerial} onChange={setHasSerial} label="Has serial" hint="Laptops, devices" />
          <CheckPill checked={hasWarranty} onChange={setHasWarranty} label="Has warranty" hint="Track claim window" />
        </div>
        {isSerialized && !hasImei && !hasSerial ? (
          <p className="text-xs text-amber-700">
            Mobiles and laptops need at least IMEI or serial tracking.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field id="lowStockThreshold" label="Low-stock alert at" hint="Units">
          <Input id="lowStockThreshold" name="lowStockThreshold" inputMode="numeric" defaultValue="0" />
        </Field>
        <Field id="reorderQty" label="Reorder qty" hint="Units per purchase">
          <Input id="reorderQty" name="reorderQty" inputMode="numeric" defaultValue="0" />
        </Field>
        <Field id="leadTimeDays" label="Lead time (days)">
          <Input id="leadTimeDays" name="leadTimeDays" inputMode="numeric" defaultValue="7" />
        </Field>
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

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Create product"}
        </Button>
      </div>
    </form>
  );
}

function CheckPill({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-lg border p-3 text-left transition-colors ${
        checked
          ? "border-indigo-600 bg-indigo-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
            checked ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
          }`}
        >
          {checked ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : null}
        </span>
        <div className={`text-sm font-medium ${checked ? "text-indigo-900" : "text-slate-900"}`}>{label}</div>
      </div>
      <p className={`mt-0.5 text-xs ${checked ? "text-indigo-700" : "text-slate-500"}`}>{hint}</p>
    </button>
  );
}
