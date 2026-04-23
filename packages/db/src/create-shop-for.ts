/**
 * One-off: make sure a given email has a Shop + OWNER membership +
 * TRIALING subscription. Safe to re-run — upserts everywhere.
 *
 *   pnpm --filter @shopos/db exec tsx src/create-shop-for.ts <email> "<shop name>"
 */
import { prismaAdmin } from "./client";
import { ShopMemberRole, ShopStatus, SubscriptionStatus } from "./generated/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const shopName = process.argv[3]?.trim() || "Admin Test Shop";
  if (!email) {
    console.error("Usage: tsx create-shop-for.ts <email> <shop name>");
    process.exit(2);
  }

  const user = await prismaAdmin.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(2);
  }

  const existing = await prismaAdmin.shopMember.findFirst({
    where: { userId: user.id },
    include: { shop: true },
  });
  if (existing) {
    console.log(`Already has shop: ${existing.shop.name} (${existing.shopId})`);
    return;
  }

  const plan = await prismaAdmin.plan.findFirst({ where: { code: "single_monthly" } });
  if (!plan) {
    console.error("single_monthly plan not seeded. Run: pnpm db:seed");
    process.exit(2);
  }

  const shop = await prismaAdmin.shop.create({
    data: { name: shopName, status: ShopStatus.ACTIVE },
  });
  await prismaAdmin.shopMember.create({
    data: { userId: user.id, shopId: shop.id, role: ShopMemberRole.OWNER },
  });
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prismaAdmin.subscription.create({
    data: {
      shopId: shop.id,
      planId: plan.id,
      status: SubscriptionStatus.TRIALING,
      trialEndsAt: trialEnds,
    },
  });
  await prismaAdmin.shop.update({
    where: { id: shop.id },
    data: { trialEndsAt: trialEnds },
  });

  console.log(`Shop created for ${email}: ${shop.name} (${shop.id})`);
  console.log(`14-day trial ends: ${trialEnds.toISOString()}`);
  console.log("Onboarding form will still let you set opening cash + address.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaAdmin.$disconnect();
  });
