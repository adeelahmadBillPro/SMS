export type ProductCategoryCode =
  | "MOBILE"
  | "LAPTOP"
  | "ACCESSORY"
  | "CHARGER"
  | "COVER"
  | "SIM"
  | "OTHER";

export type StockReasonCode =
  | "PURCHASE"
  | "SALE"
  | "RETURN_IN"
  | "RETURN_OUT"
  | "DAMAGE"
  | "ADJUSTMENT"
  | "TRANSFER"
  | "OPENING";

/**
 * Categories that track per-unit identity (IMEI / serial). Matches the
 * default for `hasImei`/`hasSerial` in the create-product form.
 */
export const SERIALIZED_CATEGORIES: ReadonlySet<ProductCategoryCode> = new Set([
  "MOBILE",
  "LAPTOP",
]);

export function isSerializedCategory(cat: ProductCategoryCode): boolean {
  return SERIALIZED_CATEGORIES.has(cat);
}
