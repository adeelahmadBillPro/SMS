import { roundMoney } from "../money/index";

/**
 * Inputs for the SPEC §7 expected-cash formula. Each sum is computed
 * directly in SQL and passed in — this module is a pure reconciliation
 * helper so it stays testable.
 */
export interface ExpectedCashInput {
  openingCash: number;
  cashSales: number;                // CASH payments linked to a sale
  cashOnAccountFromCustomers: number; // CASH payments, sale_id NULL, partyType=CUSTOMER
  cashPaidOnPurchase: number;        // CASH payments linked to a purchase
  cashOnAccountToSuppliers: number;  // CASH payments, purchase_id NULL, partyType=SUPPLIER
  cashExpenses: number;              // expense.amount where paid_via_cash=true
}

export interface ExpectedCashResult {
  openingCash: number;
  inflow: number;   // sales + on-account-in
  outflow: number;  // purchases + on-account-out + expenses
  expected: number;
}

/**
 * Deterministic version of the formula in SPEC §7. No DB calls.
 *
 *   expected = opening_cash
 *            + cash_sales
 *            + cash_on_account_from_customers
 *            - cash_paid_on_purchase
 *            - cash_on_account_to_suppliers
 *            - cash_expenses
 */
export function computeExpectedCash(input: ExpectedCashInput): ExpectedCashResult {
  const inflow = roundMoney(input.cashSales + input.cashOnAccountFromCustomers);
  const outflow = roundMoney(
    input.cashPaidOnPurchase + input.cashOnAccountToSuppliers + input.cashExpenses,
  );
  const expected = roundMoney(input.openingCash + inflow - outflow);
  return { openingCash: roundMoney(input.openingCash), inflow, outflow, expected };
}

/** variance = actual - expected. Negative means cashier is short. */
export function computeVariance(actual: number, expected: number): number {
  return roundMoney(actual - expected);
}
