"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PRESET_LABELS, type DateRange, type PresetKey } from "./date-range";

const PRESETS: PresetKey[] = ["today", "yesterday", "last_7", "this_month", "last_month", "this_year"];

export function RangePicker({ range }: { range: DateRange }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customOpen, setCustomOpen] = useState(range.preset === "custom");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  function push(qs: string) {
    const extras: string[] = [];
    for (const [k, v] of searchParams.entries()) {
      if (k !== "preset" && k !== "from" && k !== "to") extras.push(`${k}=${encodeURIComponent(v)}`);
    }
    const full = [qs, ...extras].filter(Boolean).join("&");
    router.push(`${pathname}?${full}`);
  }

  function selectPreset(p: PresetKey) {
    setCustomOpen(false);
    push(`preset=${p}`);
  }

  function applyCustom() {
    if (!from || !to) return;
    push(`preset=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => {
          const active = range.preset === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => selectPreset(p)}
              className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
            range.preset === "custom"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          Custom…
        </button>
      </div>
      {customOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
          <label className="text-xs text-slate-500">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded border border-slate-200 bg-white px-2 text-sm"
          />
          <label className="text-xs text-slate-500">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded border border-slate-200 bg-white px-2 text-sm"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="h-8 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
