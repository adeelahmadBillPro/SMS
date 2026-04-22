import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { listSuppliers } from "@/app/suppliers/queries";
import { NewPurchaseScreen } from "./new-purchase-screen";

interface Props {
  searchParams?: Promise<{ supplier?: string }>;
}

export default async function NewPurchasePage({ searchParams }: Props) {
  const { session, membership } = await requireShop();
  const sp = (await searchParams) ?? {};
  const suppliers = await listSuppliers(membership.shopId, { limit: 200 });

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">
              <Link href="/purchases" className="hover:underline">Purchases</Link>
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Record purchase</h1>
          </div>
          <Link href="/purchases" className="text-sm text-slate-500 hover:text-slate-900">← Back</Link>
        </div>
        <NewPurchaseScreen
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, phone: s.phone }))}
          initialSupplierId={sp.supplier ?? null}
        />
      </div>
    </AppShell>
  );
}
