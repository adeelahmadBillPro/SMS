/**
 * Delete all shops owned by a user — useful when you want a pure super-admin
 * with no tenant. Safe cleanup: shop.delete cascades members + subscriptions
 * + all tenant-scoped rows.
 *
 *   pnpm --filter @shopos/db exec tsx src/purge-user-shops.ts <email>
 */
import { prismaAdmin } from "./client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: tsx purge-user-shops.ts <email>");
    process.exit(2);
  }
  const user = await prismaAdmin.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user: ${email}`);
    process.exit(2);
  }
  const members = await prismaAdmin.shopMember.findMany({ where: { userId: user.id } });
  console.log(`Found ${members.length} shop(s) for ${email} (role=${user.role}).`);
  for (const m of members) {
    await prismaAdmin.shop.delete({ where: { id: m.shopId } });
    console.log(`  deleted shop ${m.shopId}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prismaAdmin.$disconnect());
