"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archiveProductAction, updateProductAction } from "../actions";

export function ArchiveButton({ productId, isActive }: { productId: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!isActive) {
    return (
      <Button
        variant="secondary"
        size="md"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await updateProductAction(productId, { isActive: true });
            if (res.ok) router.refresh();
          });
        }}
      >
        {pending ? "Restoring…" : "Restore"}
      </Button>
    );
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="md" onClick={() => setConfirming(true)}>
        Archive
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const res = await archiveProductAction(productId);
            if (res.ok) {
              setConfirming(false);
              router.refresh();
            }
          });
        }}
      >
        {pending ? "Archiving…" : "Confirm archive"}
      </Button>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
