import Link from "next/link";
import { notFound } from "next/navigation";
import { prismaAdmin } from "@shopos/db";
import { formatPKR } from "@shopos/core";
import { requireShop } from "@/lib/require-shop";
import { getSaleForReceipt } from "../../queries";
import { ReceiptActions } from "./receipt-actions";

export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  CARD: "Card",
  CHEQUE: "Cheque",
  CREDIT: "Credit",
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireShop();
  const sale = await getSaleForReceipt(membership.shopId, id);
  if (!sale) notFound();

  const shop = await prismaAdmin.shop.findUniqueOrThrow({
    where: { id: membership.shopId },
    select: { name: true, address: true, ntn: true, gst: true },
  });

  const whatsappPhone = sale.customer?.phone?.replace(/[^\d]/g, "") ?? "";
  const itemSummary = sale.items
    .map((it) => `${it.qty}× ${it.productName} — ${formatPKR(it.lineTotal)}`)
    .join("\n");
  const waMessage = encodeURIComponent(
    `*${shop.name}* — Receipt\n` +
    `Sale #${sale.id.slice(0, 8).toUpperCase()}\n` +
    `${dateFmt.format(sale.soldAt)}\n` +
    `\n${itemSummary}\n\n` +
    `Subtotal: ${formatPKR(sale.subtotal)}\n` +
    (sale.discount > 0 ? `Discount: ${formatPKR(sale.discount)}\n` : "") +
    (sale.tax > 0 ? `Tax: ${formatPKR(sale.tax)}\n` : "") +
    `Total: ${formatPKR(sale.total)}\n` +
    (sale.creditAmount > 0 ? `On credit: ${formatPKR(sale.creditAmount)}\n` : "") +
    `\nThank you!`
  );
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${waMessage}`
    : `https://wa.me/?text=${waMessage}`;

  return (
    <div className="min-h-dvh bg-slate-100 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-xl px-4 print:max-w-full print:px-0">
        {/* Header — hidden on print */}
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Link href="/pos" className="text-sm text-slate-600 hover:text-slate-900">
            ← New sale
          </Link>
          <ReceiptActions whatsappUrl={whatsappUrl} />
        </div>

        {/* The printable receipt */}
        <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">{shop.name}</h1>
            {shop.address ? <p className="mt-0.5 text-xs text-slate-500">{shop.address}</p> : null}
            <p className="mt-0.5 text-xs text-slate-500">
              {shop.ntn ? <span>NTN {shop.ntn}</span> : null}
              {shop.ntn && shop.gst ? " · " : null}
              {shop.gst ? <span>GST {shop.gst}</span> : null}
            </p>
          </div>

          <hr className="my-4 border-dashed border-slate-300" />

          <div className="flex items-center justify-between text-xs text-slate-600">
            <div>
              <p>Receipt <span className="font-mono text-slate-900">#{sale.id.slice(0, 8).toUpperCase()}</span></p>
              <p>{dateFmt.format(sale.soldAt)}</p>
            </div>
            <div className="text-right">
              <p>{sale.customer?.name ?? "Walk-in customer"}</p>
              {sale.customer?.phone ? <p>{sale.customer.phone}</p> : null}
            </div>
          </div>

          <hr className="my-4 border-dashed border-slate-300" />

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="pb-2">Item</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="py-1.5 pr-2 text-slate-900">
                    {it.productName}
                    {it.imei ? <div className="text-[10px] font-mono text-slate-500">IMEI {it.imei}</div> : null}
                    {it.serial ? <div className="text-[10px] font-mono text-slate-500">SN {it.serial}</div> : null}
                    {it.discount > 0 ? (
                      <div className="text-[10px] text-slate-500">Discount −{formatPKR(it.discount)}</div>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-center tabular-nums text-slate-700">{it.qty}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-700">{formatPKR(it.unitPrice)}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-900">{formatPKR(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="my-4 border-dashed border-slate-300" />

          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatPKR(sale.subtotal)} />
            {sale.discount > 0 ? <Row label="Discount" value={`- ${formatPKR(sale.discount)}`} /> : null}
            {sale.tax > 0 ? <Row label="Tax" value={formatPKR(sale.tax)} /> : null}
            <Row label="Total" value={formatPKR(sale.total)} emphasis />
            <div className="pt-2 space-y-1 text-xs text-slate-600">
              {sale.payments.map((p) => (
                <Row key={p.id} label={METHOD_LABELS[p.method] ?? p.method} value={formatPKR(p.amount)} />
              ))}
              {sale.creditAmount > 0 ? (
                <Row label="On credit (Udhaar)" value={formatPKR(sale.creditAmount)} />
              ) : null}
            </div>
          </dl>

          <hr className="my-4 border-dashed border-slate-300" />

          <FbrStamp
            status={sale.fbrStatus}
            invoiceNumber={sale.fbrInvoiceNumber}
            qr={sale.fbrQrCode}
            error={sale.fbrError}
          />

          <p className="text-center text-xs text-slate-500">
            Served by {sale.cashier.email}
          </p>
          <p className="mt-1 text-center text-xs text-slate-400">Thank you for shopping with us.</p>
        </article>
      </div>
    </div>
  );
}

function FbrStamp({
  status,
  invoiceNumber,
  qr,
  error,
}: {
  status: "NONE" | "PENDING" | "POSTED" | "FAILED";
  invoiceNumber: string | null;
  qr: string | null;
  error: string | null;
}) {
  if (status === "NONE") return null;

  if (status === "POSTED" && qr) {
    return (
      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">FBR invoice</p>
          <p className="mt-0.5 truncate font-mono text-xs text-indigo-900">{invoiceNumber}</p>
        </div>
        <div className="h-20 w-20 shrink-0 rounded border border-indigo-200 bg-white p-1 text-[8px] text-slate-400">
          {/* Real QR rendering lands with M14 FBR live. For now just display the payload as text so
              the receipt documents what will be encoded. */}
          <div className="flex h-full w-full items-center justify-center break-all p-1 text-center">{qr}</div>
        </div>
      </div>
    );
  }

  const tone =
    status === "PENDING"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-rose-200 bg-rose-50 text-rose-900"; // FAILED
  const label = status === "PENDING" ? "FBR pending" : "FBR failed";
  return (
    <div className={`mb-4 rounded-md border px-3 py-2 text-center text-xs ${tone}`}>
      <p className="font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 opacity-80">
        {status === "PENDING"
          ? "This invoice will be posted to FBR once the worker integration goes live."
          : (error ?? "Post failed — super-admin can retry.")}
      </p>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={emphasis ? "text-base font-medium text-slate-900" : "text-slate-600"}>{label}</dt>
      <dd
        className={
          emphasis
            ? "tabular-nums text-base font-semibold text-slate-900"
            : "tabular-nums text-slate-900"
        }
      >
        {value}
      </dd>
    </div>
  );
}
