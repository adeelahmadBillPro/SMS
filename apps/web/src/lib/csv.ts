/**
 * Minimal CSV encoder. No dependency on a library — CSV is a small enough
 * format that we'd rather own the quoting rules than argue with papaparse
 * about them. UTF-8 BOM at the start so Excel on Windows opens the file
 * in the correct encoding without manual "Import data from text".
 *
 * Rules applied:
 *   - Values containing `,`, `"`, `\n`, or `\r` get wrapped in quotes
 *   - Embedded quotes are doubled (`"` → `""`)
 *   - `null` / `undefined` render as empty
 *   - numbers use `toLocaleString("en-PK")` for digit grouping if requested
 */

export type CsvValue = string | number | boolean | Date | null | undefined;
export type CsvRow = CsvValue[];

const NEEDS_QUOTE = /[",\r\n]/;

function encodeCell(v: CsvValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return String(v);
  }
  const s = String(v);
  if (!NEEDS_QUOTE.test(s)) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: CsvRow[]): string {
  const lines: string[] = [];
  lines.push(header.map(encodeCell).join(","));
  for (const r of rows) lines.push(r.map(encodeCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Build a Next Response for CSV download with a suggested filename. */
export function csvResponse(filename: string, body: string): Response {
  const safeName = filename.replace(/[^\w.-]/g, "_");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
