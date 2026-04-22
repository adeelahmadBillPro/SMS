export type PaymentMethodCode =
  | "CASH"
  | "BANK"
  | "JAZZCASH"
  | "EASYPAISA"
  | "CARD"
  | "CHEQUE"
  | "CREDIT";

export const NON_CREDIT_METHODS: ReadonlySet<PaymentMethodCode> = new Set([
  "CASH",
  "BANK",
  "JAZZCASH",
  "EASYPAISA",
  "CARD",
  "CHEQUE",
]);

/** A single line on the in-memory cart before the sale is committed. */
export interface CartLine {
  productId: string;
  variantId?: string | null;
  /** Display-only; the server re-fetches and re-validates */
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  unitCost: number;
  /** Absolute PKR discount on this line (0 if none). */
  discount: number;
  /** Tax rate on this line (e.g. 18 for 18%). */
  taxRate: number;
  /** For serialized (IMEI/serial) products — one identifier per unit expected. */
  identifiers?: string[];
}

export interface PaymentInput {
  method: PaymentMethodCode;
  amount: number;
}

export interface LineTotals {
  subtotalBeforeDiscount: number; // qty * unitPrice
  lineDiscount: number;
  taxableBase: number;             // after line discount
  tax: number;                     // round(taxableBase * taxRate / 100, 2)
  lineTotal: number;               // taxableBase + tax
}

export interface CartTotals {
  lines: LineTotals[];
  subtotal: number;                // sum(taxableBase) — after line discounts, before bill discount
  lineDiscountTotal: number;
  billDiscount: number;
  tax: number;
  total: number;                   // what the customer owes
}
