"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { saveFbrCredsAction } from "./actions";

export function FbrCredsForm({ isConfigured }: { isConfigured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFlash(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveFbrCredsAction({
        posId: String(fd.get("posId") ?? ""),
        apiKey: String(fd.get("apiKey") ?? ""),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFlash("Saved — encrypted and stored.");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  function onClear() {
    setError(null);
    setFlash(null);
    if (!confirm("Clear FBR credentials for this shop? New sales will stop being FBR-tagged.")) return;
    startTransition(async () => {
      const res = await saveFbrCredsAction({ clear: true });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFlash("Credentials cleared.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field id="posId" label="FBR POS ID" hint={isConfigured ? "Leave blank to keep the current value" : "From FBR POS Integration"}>
        <Input id="posId" name="posId" placeholder={isConfigured ? "••••••••" : "e.g. POS-1234567"} autoComplete="off" />
      </Field>
      <Field id="apiKey" label="API key" hint={isConfigured ? "Leave blank to keep the current value" : "Treat as password"}>
        <Input id="apiKey" name="apiKey" type="password" placeholder={isConfigured ? "••••••••" : ""} autoComplete="off" />
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
      {flash ? (
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          {flash}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        {isConfigured ? (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="text-xs text-rose-700 hover:underline disabled:opacity-50"
          >
            Clear credentials
          </button>
        ) : <span />}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
