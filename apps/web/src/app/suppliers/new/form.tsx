"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { createSupplierAction } from "../actions";

export function NewSupplierForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createSupplierAction({
        name: String(fd.get("name") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        address: String(fd.get("address") ?? ""),
        ntn: String(fd.get("ntn") ?? ""),
        openingBalance: String(fd.get("openingBalance") ?? "0"),
        notes: String(fd.get("notes") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      router.push(`/suppliers/${res.data.id}`);
    });
  }
  const fe = (p: string) => fieldErrors[p]?.[0];

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field id="name" label="Supplier name" error={fe("name")}>
        <Input id="name" name="name" required autoFocus placeholder="e.g. Karachi Mobile House" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="phone" label="Phone" hint="Used for manual reminders">
          <Input id="phone" name="phone" inputMode="tel" placeholder="03xx-xxxxxxx" />
        </Field>
        <Field id="ntn" label="NTN" hint="Optional">
          <Input id="ntn" name="ntn" />
        </Field>
      </div>
      <Field id="address" label="Address" hint="Optional">
        <Input id="address" name="address" />
      </Field>
      <Field id="openingBalance" label="Opening balance (PKR)" hint="What you already owe this supplier">
        <Input id="openingBalance" name="openingBalance" inputMode="decimal" defaultValue="0" />
      </Field>
      <Field id="notes" label="Notes" hint="Optional">
        <Input id="notes" name="notes" />
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
          {pending ? "Saving…" : "Add supplier"}
        </Button>
      </div>
    </form>
  );
}
