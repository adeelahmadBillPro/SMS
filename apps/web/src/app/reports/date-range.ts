import { Closing } from "@shopos/core";

export interface DateRange {
  from: string; // YYYY-MM-DD (PKT)
  to: string;   // YYYY-MM-DD inclusive
  preset: PresetKey;
}

export type PresetKey =
  | "today"
  | "yesterday"
  | "last_7"
  | "this_month"
  | "last_month"
  | "this_year"
  | "custom";

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7: "Last 7 days",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  custom: "Custom",
};

/** Resolve a URL searchParams object → concrete {from, to, preset}. */
export function resolveRange(sp: { from?: string; to?: string; preset?: string }): DateRange {
  const preset = (sp.preset as PresetKey | undefined) ?? "this_month";
  if (preset === "custom" && sp.from && sp.to) {
    return { from: sp.from, to: sp.to, preset: "custom" };
  }
  return rangeForPreset(preset === "custom" ? "this_month" : preset);
}

export function rangeForPreset(p: PresetKey): DateRange {
  const today = Closing.pktDateString(new Date());
  switch (p) {
    case "today":
      return { from: today, to: today, preset: p };
    case "yesterday": {
      const y = Closing.addPktDays(today, -1);
      return { from: y, to: y, preset: p };
    }
    case "last_7": {
      const from = Closing.addPktDays(today, -6);
      return { from, to: today, preset: p };
    }
    case "this_month": {
      const [y, m] = today.split("-");
      return { from: `${y}-${m}-01`, to: today, preset: p };
    }
    case "last_month": {
      const [y, m] = today.split("-").map(Number) as [number, number, number];
      const lastMonth = m === 1 ? 12 : m - 1;
      const lastMonthYear = m === 1 ? y - 1 : y;
      const mm = String(lastMonth).padStart(2, "0");
      const daysInMonth = new Date(Date.UTC(lastMonthYear, lastMonth, 0)).getUTCDate();
      return {
        from: `${lastMonthYear}-${mm}-01`,
        to: `${lastMonthYear}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
        preset: p,
      };
    }
    case "this_year": {
      const [y] = today.split("-");
      return { from: `${y}-01-01`, to: today, preset: p };
    }
    default:
      return { from: today, to: today, preset: "today" };
  }
}

/** Convert a {from,to} YYYY-MM-DD pair into the UTC [start, end) half-open range. */
export function rangeToBoundary(range: DateRange): { start: Date; end: Date } {
  const { start } = Closing.pktDayBoundaryFromDateString(range.from);
  const { end } = Closing.pktDayBoundaryFromDateString(range.to);
  return { start, end };
}

/** Build a querystring preserving the current preset/from/to. */
export function rangeQuery(range: DateRange): string {
  if (range.preset === "custom") {
    return `preset=custom&from=${range.from}&to=${range.to}`;
  }
  return `preset=${range.preset}`;
}
