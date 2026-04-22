/**
 * Non-interactive CLI to create or elevate a super-admin user.
 *   pnpm admin:create -- <email>
 */
import { prismaAdmin } from "./client";
import { UserRole } from "./generated/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: pnpm admin:create -- <email>");
    process.exit(2);
  }

  const user = await prismaAdmin.user.upsert({
    where: { email },
    create: { email, role: UserRole.SUPER_ADMIN, name: "Platform Admin" },
    update: { role: UserRole.SUPER_ADMIN },
  });

  console.log(`Super-admin ready: ${user.email} (id=${user.id})`);
  console.log("They must set a password via the reset-password flow on first login.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prismaAdmin.$disconnect();
  });
