"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { quickAddCustomerAction } from "../actions";

export function NewCustomerForm() {
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
      const res = await quickAddCustomerAction({
        name: String(fd.get("name") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        cnic: String(fd.get("cnic") ?? ""),
        creditLimit: String(fd.get("creditLimit") ?? "0"),
      });
      if (!res.ok) {
        setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }
      router.push("/customers");
    });
  }
  const fe = (p: string) => fieldErrors[p]?.[0];
  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field id="name" label="Full name" error={fe("name")}>
        <Input id="name" name="name" required autoFocus placeholder="e.g. Ali Hassan" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="phone" label="Phone" hint="Optional, used for WhatsApp receipts">
          <Input id="phone" name="phone" inputMode="tel" placeholder="03xx-xxxxxxx" />
        </Field>
        <Field id="cnic" label="CNIC" hint="Optional">
          <Input id="cnic" name="cnic" placeholder="35202-xxxxxxx-x" />
        </Field>
      </div>
      <Field id="creditLimit" label="Credit limit (PKR)" hint="0 to disable credit sales">
        <Input id="creditLimit" name="creditLimit" inputMode="decimal" defaultValue="0" />
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
          {pending ? "Saving…" : "Add customer"}
        </Button>
      </div>
    </form>
  );
}
