import Link from "next/link";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { getProduct } from "../../queries";
import { ReceiveStockForm } from "./receive-form";

export default async function ReceiveStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, membership } = await requireShop();
  const product = await getProduct(membership.shopId, id);
  if (!product) notFound();

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/inventory" className="hover:underline">Inventory</Link>
              <span className="mx-1 text-slate-300">/</span>
              <Link href={`/inventory/${product.id}`} className="hover:underline">{product.name}</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Receive stock</h1>
            <p className="mt-1 text-sm text-slate-500">
              {product.hasImei ? "Enter one IMEI per unit." : null}
              {product.hasSerial ? "Enter one serial per unit." : null}
              {!product.hasImei && !product.hasSerial ? "Enter total qty received." : null}
            </p>
          </div>
          <Link href={`/inventory/${product.id}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← Back
          </Link>
        </div>

        <ReceiveStockForm
          productId={product.id}
          hasImei={product.hasImei}
          hasSerial={product.hasSerial}
          defaultCost={product.cost}
          variants={product.variants.map((v) => ({
            id: v.id,
            label: [v.color, v.storage, v.ram].filter(Boolean).join(" · ") || "Default",
          }))}
        />
      </div>
    </AppShell>
  );
}
