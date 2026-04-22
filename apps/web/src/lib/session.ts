import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { prismaAdmin } from "@shopos/db";
import type { ShopMemberRole, UserRole } from "@shopos/db";

export interface AppSession {
  userId: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface AppMembership {
  shopId: string;
  role: ShopMemberRole;
  shopName: string;
}

/**
 * Resolve the current session. Cached per request (React cache).
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  const h = await headers();
  const sess = await auth.api.getSession({ headers: h });
  if (!sess?.user) return null;
  return {
    userId: sess.user.id,
    email: sess.user.email,
    role: (sess.user as { role?: UserRole }).role ?? ("USER" as UserRole),
    emailVerified: sess.user.emailVerified ?? false,
  };
});

/**
 * Return all shops the signed-in user is a member of (OWNER/MANAGER/etc.).
 * Uses the admin client because shop_member is a global table; RLS doesn't apply.
 */
export const getMemberships = cache(async (userId: string): Promise<AppMembership[]> => {
  const rows = await prismaAdmin.shopMember.findMany({
    where: { userId },
    include: { shop: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({ shopId: m.shopId, role: m.role, shopName: m.shop.name }));
});

/**
 * Convenience for pages that require exactly one shop context.
 * Returns the first membership (single-shop case, which is 95%+ of users).
 * Phase 2 multi-branch will expand this.
 */
export async function getPrimaryMembership(userId: string): Promise<AppMembership | null> {
  const list = await getMemberships(userId);
  return list[0] ?? null;
}
