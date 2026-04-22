import { PrismaClient, type Prisma } from "./generated/client";
import { env } from "./env";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function makeClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["warn", "error"],
  });
}

// Tenant runtime client — connects as shopos_app; RLS policies apply.
export const prisma = makeClient(env.DATABASE_APP_URL);

// Admin client — connects as shopos_admin (BYPASSRLS). Only import this
// from /admin code paths wrapped in an audit-log middleware.
export const prismaAdmin = makeClient(env.DATABASE_ADMIN_URL);

/**
 * Run a callback inside a transaction scoped to a shop. Sets
 * `app.current_shop_id` so the tenant_isolation RLS policy resolves
 * to the caller's tenant. The UUID regex is the last-line defense
 * against SQL injection — SET LOCAL cannot take bind parameters.
 */
export async function withShop<T>(
  shopId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(shopId)) throw new Error(`withShop: invalid shopId ${JSON.stringify(shopId)}`);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_shop_id = '${shopId}'`);
    return fn(tx);
  });
}

/**
 * Same as withShop but using the admin (bypass) client — for impersonation
 * code paths. Caller is responsible for writing audit_log.
 */
export async function withShopAsAdmin<T>(
  shopId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!UUID.test(shopId)) throw new Error(`withShopAsAdmin: invalid shopId ${JSON.stringify(shopId)}`);
  return prismaAdmin.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.current_shop_id = '${shopId}'`);
    return fn(tx);
  });
}
