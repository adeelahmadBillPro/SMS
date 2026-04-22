"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { createVariantAction } from "../actions";

export function AddVariantForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createVariantAction({
        productId,
        color: String(fd.get("color") ?? ""),
        storage: String(fd.get("storage") ?? ""),
        ram: String(fd.get("ram") ?? ""),
        costOverride: String(fd.get("costOverride") ?? "") || undefined,
        priceOverride: String(fd.get("priceOverride") ?? "") || undefined,
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
      <div className="grid grid-cols-3 gap-3">
        <Field id="color" label="Color" hint="Black, Blue…">
          <Input id="color" name="color" />
        </Field>
        <Field id="storage" label="Storage" hint="128GB">
          <Input id="storage" name="storage" />
        </Field>
        <Field id="ram" label="RAM" hint="8GB">
          <Input id="ram" name="ram" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="costOverride" label="Cost override" hint="Leaves product default if blank">
          <Input id="costOverride" name="costOverride" inputMode="decimal" />
        </Field>
        <Field id="priceOverride" label="Price override">
          <Input id="priceOverride" name="priceOverride" inputMode="decimal" />
        </Field>
      </div>
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      ) : null}
      <div className="flex items-center justify-end">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add variant"}
        </Button>
      </div>
    </form>
  );
}
