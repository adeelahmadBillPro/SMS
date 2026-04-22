import type { PaymentMethodCode } from "../billing/types";

export interface PurchaseLine {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
  taxRate: number;
  /** Only for products with hasImei / hasSerial — one identifier per unit. */
  identifiers?: string[];
}

export interface PurchaseLineTotals {
  subtotalBeforeTax: number; // qty * unitCost
  tax: number;
  lineTotal: number;
}

export interface PurchaseTotals {
  lines: PurchaseLineTotals[];
  subtotal: number;
  tax: number;
  total: number;
}

/** Payment input for purchase-at-receive or on-account settlement. */
export interface PaymentLeg {
  method: PaymentMethodCode; // "CREDIT" means "owe the supplier / customer"
  amount: number;
}
