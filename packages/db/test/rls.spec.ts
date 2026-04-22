/**
 * RLS isolation proof.
 *
 * Creates two shops (A and B), seeds representative rows into each via the
 * admin (BYPASSRLS) client, then uses the tenant (shopos_app) client to
 * assert that:
 *   1. With app.current_shop_id = A, rows from B are invisible on SELECT.
 *   2. Without app.current_shop_id, every RLS'd table returns zero rows.
 *   3. Attempting UPDATE/DELETE on B's rows while scoped to A affects 0 rows.
 *   4. INSERT with a foreign shop_id (WITH CHECK) is blocked.
 *
 * CI blocks the PR if any of these fail.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma, prismaAdmin, withShop } from "../src/client";
import {
  AccountType,
  FbrStatus,
  PaymentMethod,
  PaymentPartyType,
  PlanInterval,
  ProductCategory,
  ShopMemberRole,
  UserRole,
} from "../src/generated/client";

const RLS_TABLES = [
  "product",
  "product_variant",
  "stock_item",
  "stock_movement",
  "supplier",
  "purchase",
  "purchase_item",
  "customer",
  "sale",
  "sale_item",
  "payment",
  "account",
  "ledger_entry",
  "expense",
  "closing",
  "forecast_snapshot",
  "sync_mutation",
  "subscription",
  "feature_flag",
] as const;

type Fixture = { shopId: string; userId: string; productId: string; customerId: string; saleId: string };

async function seedShop(nameSuffix: string): Promise<Fixture> {
  const plan = await prismaAdmin.plan.findFirstOrThrow();

  const user = await prismaAdmin.user.create({
    data: { email: `owner-${nameSuffix}@test.local`, role: UserRole.USER },
  });

  const shop = await prismaAdmin.shop.create({
    data: {
      name: `Test Shop ${nameSuffix}`,
      members: { create: { userId: user.id, role: ShopMemberRole.OWNER } },
      subscriptions: { create: { planId: plan.id } },
    },
  });

  const product = await prismaAdmin.product.create({
    data: {
      shopId: shop.id,
      sku: `SKU-${nameSuffix}`,
      name: `Product ${nameSuffix}`,
      category: ProductCategory.ACCESSORY,
      cost: 100,
      price: 150,
    },
  });

  const customer = await prismaAdmin.customer.create({
    data: { shopId: shop.id, name: `Customer ${nameSuffix}`, phone: `030000000${nameSuffix === "A" ? 1 : 2}` },
  });

  const supplier = await prismaAdmin.supplier.create({
    data: { shopId: shop.id, name: `Supplier ${nameSuffix}` },
  });

  const account = await prismaAdmin.account.create({
    data: { shopId: shop.id, code: `1000-${nameSuffix}`, name: "Cash", type: AccountType.ASSET },
  });

  const sale = await prismaAdmin.sale.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      cashierUserId: user.id,
      soldAt: new Date(),
      subtotal: 150,
      total: 150,
    },
  });

  await prismaAdmin.saleItem.create({
    data: {
      shopId: shop.id,
      saleId: sale.id,
      productId: product.id,
      qty: 1,
      unitPrice: 150,
      unitCost: 100,
      lineTotal: 150,
    },
  });

  await prismaAdmin.payment.create({
    data: {
      shopId: shop.id,
      saleId: sale.id,
      method: PaymentMethod.CASH,
      amount: 150,
      paidAt: new Date(),
    },
  });

  await prismaAdmin.ledgerEntry.create({
    data: {
      shopId: shop.id,
      entryDate: new Date(),
      accountId: account.id,
      debit: 150,
      credit: 0,
    },
  });

  // keep supplier referenced so lint doesn't complain about unused
  void supplier;

  return { shopId: shop.id, userId: user.id, productId: product.id, customerId: customer.id, saleId: sale.id };
}

let A: Fixture;
let B: Fixture;

beforeAll(async () => {
  // Ensure at least one plan exists for the Subscription FK.
  await prismaAdmin.plan.upsert({
    where: { code: "rls_test_plan" },
    create: { code: "rls_test_plan", name: "Test Plan", pricePkr: 0, interval: PlanInterval.MONTH },
    update: {},
  });
  A = await seedShop("A");
  B = await seedShop("B");
});

afterAll(async () => {
  // Cascade deletes clean everything up through shop → members → all children.
  await prismaAdmin.shop.deleteMany({ where: { id: { in: [A?.shopId, B?.shopId].filter(Boolean) as string[] } } });
  await prismaAdmin.user.deleteMany({ where: { email: { in: ["owner-A@test.local", "owner-B@test.local"] } } });
  await prismaAdmin.$disconnect();
  await prisma.$disconnect();
});

describe("RLS — tenant isolation", () => {
  it("without app.current_shop_id, every RLS'd table returns 0 rows", async () => {
    // The tenant client with no SET LOCAL must see nothing.
    for (const table of RLS_TABLES) {
      const rows = await prisma.$queryRawUnsafe<{ count: string }[]>(
        `SELECT count(*)::text AS count FROM ${table}`,
      );
      expect(Number(rows[0]?.count ?? "0"), `table=${table}`).toBe(0);
    }
  });

  it("scoped to shop A: sees A's rows, never B's", async () => {
    await withShop(A.shopId, async (tx) => {
      const products = await tx.product.findMany();
      expect(products).toHaveLength(1);
      expect(products[0]?.shopId).toBe(A.shopId);

      const customers = await tx.customer.findMany();
      expect(customers.every((c) => c.shopId === A.shopId)).toBe(true);

      const sales = await tx.sale.findMany();
      expect(sales.every((s) => s.shopId === A.shopId)).toBe(true);

      // Try to findUnique B's customer via its id — should return null (filtered by policy).
      const other = await tx.customer.findUnique({ where: { id: B.customerId } });
      expect(other).toBeNull();
    });
  });

  it("scoped to shop B: mirror of A's isolation", async () => {
    await withShop(B.shopId, async (tx) => {
      const products = await tx.product.findMany();
      expect(products).toHaveLength(1);
      expect(products[0]?.shopId).toBe(B.shopId);

      const sales = await tx.sale.findMany();
      expect(sales.every((s) => s.shopId === B.shopId)).toBe(true);
    });
  });

  it("cannot UPDATE another tenant's rows", async () => {
    const affected = await withShop(A.shopId, async (tx) => {
      return tx.product.updateMany({
        where: { id: B.productId },
        data: { name: "HACKED" },
      });
    });
    expect(affected.count).toBe(0);

    const stillClean = await prismaAdmin.product.findUniqueOrThrow({ where: { id: B.productId } });
    expect(stillClean.name).not.toBe("HACKED");
  });

  it("cannot DELETE another tenant's rows", async () => {
    const affected = await withShop(A.shopId, async (tx) => {
      return tx.customer.deleteMany({ where: { id: B.customerId } });
    });
    expect(affected.count).toBe(0);

    const stillThere = await prismaAdmin.customer.findUnique({ where: { id: B.customerId } });
    expect(stillThere).not.toBeNull();
  });

  it("INSERT with a foreign shop_id is blocked by WITH CHECK", async () => {
    await expect(
      withShop(A.shopId, async (tx) => {
        return tx.product.create({
          data: {
            shopId: B.shopId,
            sku: "SMUGGLE",
            name: "Smuggled",
            category: ProductCategory.OTHER,
          },
        });
      }),
    ).rejects.toThrow();

    const smuggled = await prismaAdmin.product.findFirst({ where: { sku: "SMUGGLE" } });
    expect(smuggled).toBeNull();
  });

  it("sale_items, payments, ledger_entries all isolate consistently with their parent sale", async () => {
    await withShop(A.shopId, async (tx) => {
      const saleItems = await tx.saleItem.findMany();
      expect(saleItems.every((si) => si.shopId === A.shopId)).toBe(true);

      const payments = await tx.payment.findMany();
      expect(payments.every((p) => p.shopId === A.shopId)).toBe(true);

      const ledger = await tx.ledgerEntry.findMany();
      expect(ledger.every((e) => e.shopId === A.shopId)).toBe(true);

      // B's sale is not reachable via findUnique either.
      expect(await tx.sale.findUnique({ where: { id: B.saleId } })).toBeNull();
    });
  });

  it("audit_log is tenant-isolated and hides platform (null shop_id) rows", async () => {
    // Write one tenant audit row to A, one platform (null) row via admin.
    await prismaAdmin.auditLog.create({
      data: { shopId: A.shopId, action: "TEST_A", actorUserId: A.userId },
    });
    await prismaAdmin.auditLog.create({
      data: { shopId: null, action: "TEST_PLATFORM" },
    });

    await withShop(A.shopId, async (tx) => {
      const rows = await tx.auditLog.findMany();
      expect(rows.some((r) => r.action === "TEST_A")).toBe(true);
      expect(rows.some((r) => r.action === "TEST_PLATFORM")).toBe(false);
      expect(rows.every((r) => r.shopId === A.shopId)).toBe(true);
    });
  });
});
