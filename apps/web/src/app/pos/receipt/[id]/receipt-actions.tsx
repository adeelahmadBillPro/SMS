"use client";

import { Button } from "@/components/ui/button";

export function ReceiptActions({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center rounded-md bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
      >
        Send via WhatsApp
      </a>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
      >
        Print
      </Button>
    </div>
  );
}
