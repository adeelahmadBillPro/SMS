"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recomputeForecastsAction } from "@/app/forecasting/actions";

export function RecomputeButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    setFlash(null);
    startTransition(async () => {
      const res = await recomputeForecastsAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFlash(
        `Recomputed ${res.data.products} product${res.data.products === 1 ? "" : "s"} — ${res.data.suggestions} suggestion${res.data.suggestions === 1 ? "" : "s"}`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" onClick={onClick} disabled={pending} variant="secondary">
        {pending ? "Recomputing…" : "Recompute now"}
      </Button>
      {flash ? <p className="text-xs text-indigo-700">{flash}</p> : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
