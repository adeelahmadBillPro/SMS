"use server";

import { requireShop } from "@/lib/require-shop";
import { searchProductsForPos, type PosProductHit } from "./queries";

/**
 * Exposed as a Server Action so the POS client component can call it from
 * an onChange handler (debounced on the client).
 */
export async function posSearchAction(query: string): Promise<PosProductHit[]> {
  const { membership } = await requireShop();
  return searchProductsForPos(membership.shopId, query, 20);
}
