/**
 * Stock-level math. Canonical source of truth for "how many units exist now"
 * is the sum of `stock_movement.qty_delta` per product (per variant, optionally).
 * For serialized products (mobile / laptop) this must equal the count of
 * stock_item rows in IN_STOCK status — see the invariant in CLAUDE.md §5.
 *
 * These helpers are pure functions so they can be covered cheaply in unit tests
 * without a database.
 */

export interface MovementLike {
  qtyDelta: number;
  productId: string;
  variantId?: string | null;
}

export interface StockItemLike {
  productId: string;
  variantId?: string | null;
  status: "IN_STOCK" | "SOLD" | "RETURNED" | "DAMAGED";
}

export interface CurrentStockOptions {
  productId: string;
  variantId?: string | null;
}

/**
 * Sum of qty_delta for movements matching product (+variant, if supplied).
 * A movement with no variant matches any variantId filter unless variantId
 * is explicitly required — callers pass `variantId: null` to mean
 * "bucket across all variants".
 */
export function currentQtyFromMovements(
  movements: MovementLike[],
  { productId, variantId }: CurrentStockOptions,
): number {
  return movements.reduce((acc, m) => {
    if (m.productId !== productId) return acc;
    if (variantId !== undefined && variantId !== null) {
      if (m.variantId !== variantId) return acc;
    }
    return acc + m.qtyDelta;
  }, 0);
}

/**
 * Count of stock_item rows in IN_STOCK status (serialized products only).
 */
export function inStockCount(
  items: StockItemLike[],
  { productId, variantId }: CurrentStockOptions,
): number {
  return items.reduce((acc, it) => {
    if (it.productId !== productId) return acc;
    if (it.status !== "IN_STOCK") return acc;
    if (variantId !== undefined && variantId !== null) {
      if (it.variantId !== variantId) return acc;
    }
    return acc + 1;
  }, 0);
}

export interface StockInvariantViolation {
  productId: string;
  variantId: string | null;
  qtyFromMovements: number;
  inStockCount: number;
}

/**
 * For serialized products, verify `sum(qty_delta) == count(in_stock)` at
 * the (productId, variantId) grain. Returns the rows that violate.
 *
 * Run as a periodic job (after every nightly closing) and fail loudly on
 * any result — this is the core stock-correctness guarantee.
 */
export function checkSerializedStockInvariant(
  movements: MovementLike[],
  items: StockItemLike[],
): StockInvariantViolation[] {
  const keys = new Set<string>();
  for (const m of movements) keys.add(`${m.productId}::${m.variantId ?? ""}`);
  for (const it of items) keys.add(`${it.productId}::${it.variantId ?? ""}`);

  const violations: StockInvariantViolation[] = [];
  for (const key of keys) {
    const [productId, variantKey = ""] = key.split("::");
    const variantId = variantKey === "" ? null : variantKey;
    if (!productId) continue;
    const qty = currentQtyFromMovements(movements, { productId, variantId });
    const cnt = inStockCount(items, { productId, variantId });
    if (qty !== cnt) {
      violations.push({ productId, variantId, qtyFromMovements: qty, inStockCount: cnt });
    }
  }
  return violations;
}

/**
 * Guard used by write paths: if the shop disallows negative stock, refuse to
 * apply a movement that would drop the rolling total below zero.
 */
export function wouldGoNegative(
  currentQty: number,
  delta: number,
  allowNegative: boolean,
): boolean {
  if (allowNegative) return false;
  return currentQty + delta < 0;
}
