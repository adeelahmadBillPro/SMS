"use server";

import { redirect } from "next/navigation";
import { AccountType, prismaAdmin, withShop } from "@shopos/db";
import { getPrimaryMembership, getSession } from "@/lib/session";
import { onboardingSchema } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };

const DEFAULT_ACCOUNTS: Array<{ code: string; name: string; type: AccountType }> = [
  { code: "1000", name: "Cash",                  type: AccountType.ASSET },
  { code: "1100", name: "Bank",                  type: AccountType.ASSET },
  { code: "1200", name: "Customer Receivables",  type: AccountType.ASSET },
  { code: "2000", name: "Supplier Payables",     type: AccountType.LIABILITY },
  { code: "2100", name: "Tax Payable",           type: AccountType.LIABILITY },
  { code: "3000", name: "Owner Equity",          type: AccountType.EQUITY },
  { code: "4000", name: "Sales",                 type: AccountType.INCOME },
  { code: "5000", name: "Purchases",             type: AccountType.EXPENSE },
  { code: "6000", name: "Expenses",              type: AccountType.EXPENSE },
];

export async function onboardingAction(input: {
  address: string;
  ntn: string;
  gst: string;
  fbrRegistered: "yes" | "no";
  openingCash: number | string;
  openingBank: number | string;
}): Promise<Result> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const membership = await getPrimaryMembership(session.userId);
  if (!membership) return { ok: false, error: "No shop found for this user." };

  const { address, ntn, gst, fbrRegistered, openingCash, openingBank } = parsed.data;
  const defaultTaxRate = fbrRegistered === "yes" ? 18 : 0;
  const today = new Date();

  // 1. Shop details: use admin client — shop is a global (non-RLS) table.
  await prismaAdmin.shop.update({
    where: { id: membership.shopId },
    data: {
      address: address || null,
      ntn: ntn || null,
      gst: gst || null,
      defaultTaxRate,
      openingCash: openingCash,
      openingBank: openingBank,
    },
  });

  // 2. Chart of accounts + opening ledger entries: tenant-scoped under RLS.
  await withShop(membership.shopId, async (tx) => {
    for (const a of DEFAULT_ACCOUNTS) {
      await tx.account.upsert({
        where: { shopId_code: { shopId: membership.shopId, code: a.code } },
        create: { shopId: membership.shopId, code: a.code, name: a.name, type: a.type },
        update: {},
      });
    }

    const cash = await tx.account.findUniqueOrThrow({
      where: { shopId_code: { shopId: membership.shopId, code: "1000" } },
    });
    const bank = await tx.account.findUniqueOrThrow({
      where: { shopId_code: { shopId: membership.shopId, code: "1100" } },
    });
    const equity = await tx.account.findUniqueOrThrow({
      where: { shopId_code: { shopId: membership.shopId, code: "3000" } },
    });

    if (openingCash > 0) {
      await tx.ledgerEntry.createMany({
        data: [
          { shopId: membership.shopId, entryDate: today, accountId: cash.id, debit: openingCash, credit: 0, memo: "Opening balance" },
          { shopId: membership.shopId, entryDate: today, accountId: equity.id, debit: 0, credit: openingCash, memo: "Opening balance" },
        ],
      });
    }
    if (openingBank > 0) {
      await tx.ledgerEntry.createMany({
        data: [
          { shopId: membership.shopId, entryDate: today, accountId: bank.id, debit: openingBank, credit: 0, memo: "Opening balance" },
          { shopId: membership.shopId, entryDate: today, accountId: equity.id, debit: 0, credit: openingBank, memo: "Opening balance" },
        ],
      });
    }
  });

  redirect("/dashboard");
}
