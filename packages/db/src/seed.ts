/**
 * Seed plans + super-admin user. Idempotent on re-run.
 *
 * Runs via the admin client (BYPASSRLS) because super-admin has no shop.
 * The super-admin has no password — they set one on first login via the
 * password-reset email flow (wired in M2).
 */
import { prismaAdmin } from "./client";
import { PlanInterval, UserRole } from "./generated/client";
import { env } from "./env";

const PLANS = [
  { code: "single_monthly",   name: "Single Shop (Monthly)",  pricePkr: 1500,   interval: PlanInterval.MONTH,    isLifetime: false },
  { code: "multi_monthly",    name: "Multi-Branch (Monthly)", pricePkr: 3000,   interval: PlanInterval.MONTH,    isLifetime: false },
  { code: "lifetime",         name: "Lifetime",               pricePkr: 40000,  interval: PlanInterval.LIFETIME, isLifetime: true  },
] as const;

async function main() {
  console.log("Seeding plans...");
  for (const p of PLANS) {
    await prismaAdmin.plan.upsert({
      where: { code: p.code },
      create: { code: p.code, name: p.name, pricePkr: p.pricePkr, interval: p.interval, isLifetime: p.isLifetime },
      update: { name: p.name, pricePkr: p.pricePkr, interval: p.interval, isLifetime: p.isLifetime },
    });
  }

  console.log(`Seeding super-admin: ${env.SUPER_ADMIN_EMAIL}`);
  await prismaAdmin.user.upsert({
    where: { email: env.SUPER_ADMIN_EMAIL },
    create: { email: env.SUPER_ADMIN_EMAIL, role: UserRole.SUPER_ADMIN, name: "Platform Admin" },
    update: { role: UserRole.SUPER_ADMIN },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaAdmin.$disconnect();
  });
