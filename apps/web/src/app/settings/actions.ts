"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prismaAdmin } from "@shopos/db";
import { requireShop } from "@/lib/require-shop";
import { encryptFbrField } from "@/lib/fbr-crypt";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const fbrSchema = z
  .object({
    posId: z.string().trim().optional(),
    apiKey: z.string().trim().optional(),
    // Explicit "clear" checkbox so accidentally leaving the fields blank
    // doesn't erase creds that were set earlier (writes skip blanks).
    clear: z.coerce.boolean().default(false),
  })
  .refine(
    (v) => v.clear || v.posId != null || v.apiKey != null,
    { message: "Nothing to save", path: ["posId"] },
  );

/**
 * Save FBR credentials. Ciphertext lands in `shop.fbrPosIdEnc` and
 * `shop.fbrApiKeyEnc`. Empty fields are left untouched so the cashier can
 * rotate one without re-entering the other. `clear=true` wipes both.
 *
 * Shop is a global (non-RLS) table — we use prismaAdmin and scope by id.
 */
export async function saveFbrCredsAction(input: unknown): Promise<Result> {
  const parsed = fbrSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const i of parsed.error.issues) {
      const k = i.path.join(".") || "_";
      (fieldErrors[k] ??= []).push(i.message);
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors,
    };
  }
  const { membership } = await requireShop();

  try {
    const data: { fbrPosIdEnc?: string | null; fbrApiKeyEnc?: string | null } = {};
    if (parsed.data.clear) {
      data.fbrPosIdEnc = null;
      data.fbrApiKeyEnc = null;
    } else {
      if (parsed.data.posId && parsed.data.posId.length > 0) {
        data.fbrPosIdEnc = encryptFbrField(parsed.data.posId);
      }
      if (parsed.data.apiKey && parsed.data.apiKey.length > 0) {
        data.fbrApiKeyEnc = encryptFbrField(parsed.data.apiKey);
      }
    }

    if (Object.keys(data).length === 0) {
      return { ok: false, error: "Nothing to save" };
    }

    await prismaAdmin.shop.update({
      where: { id: membership.shopId },
      data,
    });
    revalidatePath("/settings");
    revalidatePath("/pos/receipt/[id]", "page");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}
