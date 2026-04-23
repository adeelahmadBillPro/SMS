import { prismaAdmin } from "@shopos/db";
import { requireShop } from "@/lib/require-shop";
import { AppShell } from "@/components/shell/app-shell";
import { FbrCredsForm } from "./fbr-form";

export default async function SettingsPage() {
  const { session, membership } = await requireShop();
  const shop = await prismaAdmin.shop.findUniqueOrThrow({
    where: { id: membership.shopId },
    select: {
      name: true,
      address: true,
      ntn: true,
      gst: true,
      defaultTaxRate: true,
      allowNegativeStock: true,
      fbrPosIdEnc: true,
      fbrApiKeyEnc: true,
    },
  });
  const fbrConfigured = !!(shop.fbrPosIdEnc && shop.fbrApiKeyEnc);

  return (
    <AppShell email={session.email} contextLabel={membership.shopName}>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Shop configuration.</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Shop</h2>
          <dl className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            <Row label="Name" value={shop.name} />
            <Row label="Address" value={shop.address ?? "—"} />
            <Row label="NTN" value={shop.ntn ?? "—"} />
            <Row label="GST" value={shop.gst ?? "—"} />
            <Row label="Default tax rate" value={`${Number(shop.defaultTaxRate)}%`} />
            <Row label="Allow negative stock" value={shop.allowNegativeStock ? "Yes" : "No"} />
          </dl>
          <p className="text-xs text-slate-400">
            Basic shop fields are set during onboarding. An editor for these lands in M11.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">FBR credentials</h2>
          <p className="text-sm text-slate-600">
            Your own FBR POS Integration credentials. Stored encrypted at rest (AES-256-GCM).
            ShopOS never holds a master key — each shop brings its own.
            Once set, every new sale is marked <span className="font-medium text-slate-800">FBR pending</span> and
            the worker will post to FBR&apos;s API when live integration ships.
          </p>
          <div className={`rounded-md border px-4 py-3 text-sm ${
            fbrConfigured
              ? "border-indigo-200 bg-indigo-50 text-indigo-900"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}>
            <span className="font-medium">
              {fbrConfigured ? "Credentials configured." : "No credentials set — sales post without FBR QR."}
            </span>
          </div>
          <FbrCredsForm isConfigured={fbrConfigured} />
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 border-b border-slate-100 px-4 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="col-span-2 text-slate-900">{value}</dd>
    </div>
  );
}
