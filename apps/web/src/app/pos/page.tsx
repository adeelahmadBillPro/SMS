import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { listCustomers } from "@/app/customers/queries";
import { PosScreen } from "./pos-screen";

export default async function PosPage() {
  const { session, membership } = await requireShop();
  // Seed the customer picker with recent customers so the first keystroke
  // isn't a round-trip.
  const recentCustomers = await listCustomers(membership.shopId, { limit: 50 });

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <PosScreen initialCustomers={recentCustomers} />
    </AppShell>
  );
}
