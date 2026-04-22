import Link from "next/link";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { NewSupplierForm } from "./form";

export default async function NewSupplierPage() {
  const { session, membership } = await requireShop();
  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-600">Suppliers</p>
            <h1 className="text-2xl font-semibold text-slate-900">Add supplier</h1>
          </div>
          <Link href="/suppliers" className="text-sm text-slate-500 hover:text-slate-900">← Back</Link>
        </div>
        <NewSupplierForm />
      </div>
    </AppShell>
  );
}
