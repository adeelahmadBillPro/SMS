"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { extendTrialAction, suspendShopAction, unsuspendShopAction } from "./actions";

export function TenantActions({
  shopId,
  status,
  currentTrialEnd,
}: {
  shopId: string;
  status: string;
  currentTrialEnd: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "suspend" | "unsuspend" | "extend">("idle");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(14);

  function reset() {
    setMode("idle");
    setReason("");
    setError(null);
  }

  function onSuspend() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Reason required (what's the call?)");
      return;
    }
    startTransition(async () => {
      const res = await suspendShopAction({ shopId, reason });
      if (!res.ok) return setError(res.error);
      setFlash("Shop suspended.");
      reset();
      router.refresh();
    });
  }

  function onUnsuspend() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Reason required");
      return;
    }
    startTransition(async () => {
      const res = await unsuspendShopAction({ shopId, reason });
      if (!res.ok) return setError(res.error);
      setFlash("Shop unsuspended.");
      reset();
      router.refresh();
    });
  }

  function onExtend() {
    setError(null);
    if (reason.trim().length < 3) {
      setError("Reason required");
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      setError("Days must be ≥ 1");
      return;
    }
    startTransition(async () => {
      const res = await extendTrialAction({ shopId, days, reason });
      if (!res.ok) return setError(res.error);
      setFlash(`Trial extended by ${days} day${days === 1 ? "" : "s"}.`);
      reset();
      router.refresh();
    });
  }

  const isSuspended = status === "SUSPENDED";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Super-admin actions</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {isSuspended ? (
            <Button variant="primary" onClick={() => setMode("unsuspend")} disabled={pending}>
              Unsuspend
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setMode("suspend")} disabled={pending}>
              Suspend
            </Button>
          )}
          <Button variant="secondary" onClick={() => setMode("extend")} disabled={pending}>
            Extend trial
          </Button>
          <p className="ml-auto text-xs text-slate-400">
            Every action is audit-logged with your email + reason.
          </p>
        </div>

        {mode !== "idle" ? (
          <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
            {mode === "extend" ? (
              <Field id="days" label="Extend by (days)">
                <Input
                  id="days"
                  type="number"
                  min={1}
                  max={180}
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 0))}
                  className="h-9 w-28"
                />
              </Field>
            ) : null}
            {mode === "extend" && currentTrialEnd ? (
              <p className="text-xs text-slate-500">
                Current end: {new Date(currentTrialEnd).toLocaleDateString("en-GB")}
              </p>
            ) : null}
            <Field id="reason" label="Reason" hint="Goes to the audit log — be specific">
              <Input
                id="reason"
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  mode === "suspend"
                    ? "e.g. payment dispute, fraud signal"
                    : mode === "unsuspend"
                      ? "e.g. dispute resolved, paid up"
                      : "e.g. hardship request, onboarding delay"
                }
              />
            </Field>
            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={mode === "suspend" ? "danger" : "primary"}
                disabled={pending}
                onClick={
                  mode === "suspend"
                    ? onSuspend
                    : mode === "unsuspend"
                      ? onUnsuspend
                      : onExtend
                }
              >
                {pending
                  ? "Saving…"
                  : mode === "suspend"
                    ? "Confirm suspend"
                    : mode === "unsuspend"
                      ? "Confirm unsuspend"
                      : "Extend trial"}
              </Button>
            </div>
          </div>
        ) : null}

        {flash ? <p className="text-xs text-indigo-700">{flash}</p> : null}
      </div>
    </section>
  );
}
