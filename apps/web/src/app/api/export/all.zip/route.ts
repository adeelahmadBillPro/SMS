import JSZip from "jszip";
import { withShop } from "@shopos/db";
import { requireShop } from "@/lib/require-shop";
import { toCsv, type CsvRow } from "@/lib/csv";
import { Closing } from "@shopos/core";

export const dynamic = "force-dynamic";

/**
 * "Download all my data" — the ROADMAP §7 / landing-page promise. Generates
 * a ZIP of CSVs covering every tenant-scoped table the shop owns. Generated
 * on demand; no pre-caching. Uses withShop() so RLS double-checks the
 * caller is scoped to their own shop even if they somehow construct the URL
 * manually.
 *
 * File layout:
 *   shopos_{shopId}_{yyyymmdd}.zip
 *     README.txt
 *     products.csv
 *     product_variants.csv
 *     stock_items.csv
 *     stock_movements.csv
 *     suppliers.csv
 *     purchases.csv
 *     purchase_items.csv
 *     customers.csv
 *     sales.csv
 *     sale_items.csv
 *     payments.csv
 *     expenses.csv
 *     ledger_entries.csv
 *     accounts.csv
 *     closings.csv
 */
export async function GET(): Promise<Response> {
  const { session, membership } = await requireShop();
  const shopId = membership.shopId;
  const today = Closing.pktDateString(new Date());
  const zip = new JSZip();

  zip.file(
    "README.txt",
    [
      `ShopOS data export for ${membership.shopName}`,
      `Shop ID: ${shopId}`,
      `Generated: ${new Date().toISOString()}`,
      `Requested by: ${session.email}`,
      ``,
      `Every CSV is UTF-8 with a BOM so Excel opens them in the correct encoding`,
      `without the "Import data from text" wizard.`,
      ``,
      `Amount columns store PKR with two decimals. Timestamps are ISO-8601 UTC;`,
      `display them in Asia/Karachi for local dates.`,
    ].join("\n"),
  );

  await withShop(shopId, async (tx) => {
    // ---- Products / Variants / Stock ----
    const products = await tx.product.findMany({ orderBy: { name: "asc" } });
    zip.file(
      "products.csv",
      toCsv(
        [
          "id", "sku", "name", "category", "brand", "model", "unit",
          "cost", "price", "tax_rate", "barcode",
          "has_imei", "has_serial", "has_warranty",
          "low_stock_threshold", "reorder_qty", "lead_time_days",
          "is_active", "created_at", "updated_at",
        ],
        products.map((p): CsvRow => [
          p.id, p.sku, p.name, p.category, p.brand ?? "", p.model ?? "", p.unit,
          Number(p.cost), Number(p.price), Number(p.taxRate), p.barcode ?? "",
          p.hasImei, p.hasSerial, p.hasWarranty,
          p.lowStockThreshold, p.reorderQty, p.leadTimeDays,
          p.isActive, p.createdAt.toISOString(), p.updatedAt.toISOString(),
        ]),
      ),
    );

    const variants = await tx.productVariant.findMany();
    zip.file(
      "product_variants.csv",
      toCsv(
        ["id", "product_id", "color", "storage", "ram", "cost_override", "price_override", "created_at"],
        variants.map((v): CsvRow => [
          v.id, v.productId, v.color ?? "", v.storage ?? "", v.ram ?? "",
          v.costOverride != null ? Number(v.costOverride) : "",
          v.priceOverride != null ? Number(v.priceOverride) : "",
          v.createdAt.toISOString(),
        ]),
      ),
    );

    const stockItems = await tx.stockItem.findMany({ orderBy: { acquiredAt: "asc" } });
    zip.file(
      "stock_items.csv",
      toCsv(
        ["id", "product_id", "variant_id", "imei", "serial", "status", "acquired_at"],
        stockItems.map((s): CsvRow => [
          s.id, s.productId, s.variantId ?? "", s.imei ?? "", s.serial ?? "",
          s.status, s.acquiredAt.toISOString(),
        ]),
      ),
    );

    const stockMovements = await tx.stockMovement.findMany({ orderBy: { createdAt: "asc" } });
    zip.file(
      "stock_movements.csv",
      toCsv(
        ["id", "product_id", "variant_id", "stock_item_id", "qty_delta", "reason", "ref_table", "ref_id", "created_at", "created_by"],
        stockMovements.map((m): CsvRow => [
          m.id, m.productId, m.variantId ?? "", m.stockItemId ?? "", m.qtyDelta,
          m.reason, m.refTable ?? "", m.refId ?? "",
          m.createdAt.toISOString(), m.createdBy ?? "",
        ]),
      ),
    );

    // ---- Suppliers / Purchases ----
    const suppliers = await tx.supplier.findMany({ orderBy: { name: "asc" } });
    zip.file(
      "suppliers.csv",
      toCsv(
        ["id", "name", "phone", "address", "ntn", "opening_balance", "notes", "created_at"],
        suppliers.map((s): CsvRow => [
          s.id, s.name, s.phone ?? "", s.address ?? "", s.ntn ?? "",
          Number(s.openingBalance), s.notes ?? "", s.createdAt.toISOString(),
        ]),
      ),
    );

    const purchases = await tx.purchase.findMany({ orderBy: { purchasedAt: "asc" } });
    zip.file(
      "purchases.csv",
      toCsv(
        ["id", "supplier_id", "invoice_no", "purchased_at", "subtotal", "tax", "total", "notes", "created_at"],
        purchases.map((p): CsvRow => [
          p.id, p.supplierId, p.invoiceNo ?? "", p.purchasedAt.toISOString(),
          Number(p.subtotal), Number(p.tax), Number(p.total), p.notes ?? "", p.createdAt.toISOString(),
        ]),
      ),
    );

    const purchaseItems = await tx.purchaseItem.findMany();
    zip.file(
      "purchase_items.csv",
      toCsv(
        ["id", "purchase_id", "product_id", "variant_id", "qty", "unit_cost", "line_total"],
        purchaseItems.map((i): CsvRow => [
          i.id, i.purchaseId, i.productId, i.variantId ?? "", i.qty,
          Number(i.unitCost), Number(i.lineTotal),
        ]),
      ),
    );

    // ---- Customers / Sales ----
    const customers = await tx.customer.findMany({ orderBy: { name: "asc" } });
    zip.file(
      "customers.csv",
      toCsv(
        ["id", "name", "phone", "cnic", "opening_balance", "credit_limit", "notes", "created_at"],
        customers.map((c): CsvRow => [
          c.id, c.name, c.phone ?? "", c.cnic ?? "",
          Number(c.openingBalance), Number(c.creditLimit), c.notes ?? "", c.createdAt.toISOString(),
        ]),
      ),
    );

    const sales = await tx.sale.findMany({ orderBy: { soldAt: "asc" } });
    zip.file(
      "sales.csv",
      toCsv(
        [
          "id", "customer_id", "cashier_user_id", "sold_at",
          "subtotal", "discount", "tax", "total", "credit_amount",
          "fbr_invoice_number", "fbr_status", "fbr_error",
          "created_at",
        ],
        sales.map((s): CsvRow => [
          s.id, s.customerId ?? "", s.cashierUserId, s.soldAt.toISOString(),
          Number(s.subtotal), Number(s.discount), Number(s.tax), Number(s.total), Number(s.creditAmount),
          s.fbrInvoiceNumber ?? "", s.fbrStatus, s.fbrError ?? "",
          s.createdAt.toISOString(),
        ]),
      ),
    );

    const saleItems = await tx.saleItem.findMany();
    zip.file(
      "sale_items.csv",
      toCsv(
        ["id", "sale_id", "product_id", "variant_id", "stock_item_id", "qty", "unit_price", "unit_cost", "discount", "tax", "line_total"],
        saleItems.map((i): CsvRow => [
          i.id, i.saleId, i.productId, i.variantId ?? "", i.stockItemId ?? "", i.qty,
          Number(i.unitPrice), Number(i.unitCost), Number(i.discount), Number(i.tax), Number(i.lineTotal),
        ]),
      ),
    );

    // ---- Payments / Expenses ----
    const payments = await tx.payment.findMany({ orderBy: { paidAt: "asc" } });
    zip.file(
      "payments.csv",
      toCsv(
        ["id", "sale_id", "purchase_id", "party_type", "customer_id", "supplier_id", "method", "amount", "paid_at", "note"],
        payments.map((p): CsvRow => [
          p.id, p.saleId ?? "", p.purchaseId ?? "", p.partyType ?? "",
          p.customerId ?? "", p.supplierId ?? "", p.method,
          Number(p.amount), p.paidAt.toISOString(), p.note ?? "",
        ]),
      ),
    );

    const expenses = await tx.expense.findMany({ orderBy: { paidAt: "asc" } });
    zip.file(
      "expenses.csv",
      toCsv(
        ["id", "category", "amount", "paid_at", "paid_via_cash", "note", "created_at"],
        expenses.map((e): CsvRow => [
          e.id, e.category, Number(e.amount), e.paidAt.toISOString(),
          e.paidViaCash, e.note ?? "", e.createdAt.toISOString(),
        ]),
      ),
    );

    // ---- Ledger / Closings ----
    const accounts = await tx.account.findMany({ orderBy: { code: "asc" } });
    zip.file(
      "accounts.csv",
      toCsv(
        ["id", "code", "name", "type", "created_at"],
        accounts.map((a): CsvRow => [a.id, a.code, a.name, a.type, a.createdAt.toISOString()]),
      ),
    );

    const ledger = await tx.ledgerEntry.findMany({ orderBy: { createdAt: "asc" } });
    zip.file(
      "ledger_entries.csv",
      toCsv(
        ["id", "entry_date", "account_id", "debit", "credit", "ref_table", "ref_id", "memo", "created_at"],
        ledger.map((l): CsvRow => [
          l.id, l.entryDate.toISOString().slice(0, 10), l.accountId,
          Number(l.debit), Number(l.credit), l.refTable ?? "", l.refId ?? "",
          l.memo ?? "", l.createdAt.toISOString(),
        ]),
      ),
    );

    const closings = await tx.closing.findMany({ orderBy: { closingDate: "asc" } });
    zip.file(
      "closings.csv",
      toCsv(
        ["id", "closing_date", "opening_cash", "expected_cash", "actual_cash", "variance", "notes", "closed_by", "closed_at", "reversed_at", "reversed_reason"],
        closings.map((c): CsvRow => [
          c.id, c.closingDate.toISOString().slice(0, 10),
          Number(c.openingCash), Number(c.expectedCash), Number(c.actualCash), Number(c.variance),
          c.notes ?? "", c.closedBy,
          c.closedAt.toISOString(),
          c.reversedAt ? c.reversedAt.toISOString() : "",
          c.reversedReason ?? "",
        ]),
      ),
    );
  });

  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const filename = `shopos_${membership.shopName.replace(/[^\w]/g, "_")}_${today}.zip`.toLowerCase();

  return new Response(blob as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Content-Length": String(blob.length),
    },
  });
}
