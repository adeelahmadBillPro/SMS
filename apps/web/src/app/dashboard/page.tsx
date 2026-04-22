import { redirect } from "next/navigation";
import { getPrimaryMembership, getSession } from "@/lib/session";
import { logoutAction } from "../(auth)/logout/action";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await getPrimaryMembership(session.userId);
  if (!membership) redirect("/onboarding");

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-slate-900">ShopOS</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-sm text-slate-600">{membership.shopName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{session.email}</span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Your shop is set up. Inventory, billing, and closing will land here in the next
              release.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PlaceholderCard title="Cash in hand" value="—" note="Tracked after first closing" />
            <PlaceholderCard title="Today's sales" value="—" note="Coming in Phase 1" />
            <PlaceholderCard title="Items needing reorder" value="—" note="Forecasting snapshot pending" />
          </div>

          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            <p className="font-medium">You&apos;re on the 14-day free trial.</p>
            <p className="mt-1 text-indigo-800">
              Add products, record sales, and close your first day to get a feel for the flow.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function PlaceholderCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}
