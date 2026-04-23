"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ShopStatus, prismaAdmin } from "@shopos/db";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

async function requireSuperAdmin(): Promise<string> {
  const session = await getSession();
  if (!session) throw new Error("Not signed in");
  if (session.role !== "SUPER_ADMIN") throw new Error("Super-admin only");
  return session.userId;
}

const suspendSchema = z.object({
  shopId: z.string().uuid(),
  reason: z.string().trim().min(3, "Reason required").max(500),
});

export async function suspendShopAction(input: unknown): Promise<Result> {
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  try {
    const actor = await requireSuperAdmin();
    const before = await prismaAdmin.shop.findUniqueOrThrow({
      where: { id: parsed.data.shopId },
      select: { status: true },
    });
    if (before.status === "SUSPENDED") return { ok: false, error: "Already suspended" };

    await prismaAdmin.shop.update({
      where: { id: parsed.data.shopId },
      data: { status: ShopStatus.SUSPENDED },
    });

    await logAudit({
      action: "SHOP_SUSPENDED",
      actorUserId: actor,
      actorRole: "SUPER_ADMIN",
      shopId: parsed.data.shopId,
      targetTable: "shop",
      targetId: parsed.data.shopId,
      before,
      after: { status: ShopStatus.SUSPENDED },
      reason: parsed.data.reason,
    });
    revalidatePath(`/admin/tenants/${parsed.data.shopId}`);
    revalidatePath(`/admin`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Suspend failed" };
  }
}

const unsuspendSchema = z.object({
  shopId: z.string().uuid(),
  reason: z.string().trim().min(3, "Reason required").max(500),
});

export async function unsuspendShopAction(input: unknown): Promise<Result> {
  const parsed = unsuspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const actor = await requireSuperAdmin();
    const before = await prismaAdmin.shop.findUniqueOrThrow({
      where: { id: parsed.data.shopId },
      select: { status: true },
    });
    if (before.status !== "SUSPENDED") return { ok: false, error: "Shop is not suspended" };

    await prismaAdmin.shop.update({
      where: { id: parsed.data.shopId },
      data: { status: ShopStatus.ACTIVE },
    });
    await logAudit({
      action: "SHOP_UNSUSPENDED",
      actorUserId: actor,
      actorRole: "SUPER_ADMIN",
      shopId: parsed.data.shopId,
      targetTable: "shop",
      targetId: parsed.data.shopId,
      before,
      after: { status: ShopStatus.ACTIVE },
      reason: parsed.data.reason,
    });
    revalidatePath(`/admin/tenants/${parsed.data.shopId}`);
    revalidatePath(`/admin`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unsuspend failed" };
  }
}

const extendTrialSchema = z.object({
  shopId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(180),
  reason: z.string().trim().min(3, "Reason required").max(500),
});

export async function extendTrialAction(input: unknown): Promise<Result> {
  const parsed = extendTrialSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    const actor = await requireSuperAdmin();

    const sub = await prismaAdmin.subscription.findFirst({
      where: { shopId: parsed.data.shopId },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) return { ok: false, error: "No subscription found for this shop" };

    const base = sub.trialEndsAt ?? new Date();
    const next = new Date(base.getTime() + parsed.data.days * 24 * 60 * 60 * 1000);

    await prismaAdmin.subscription.update({
      where: { id: sub.id },
      data: { trialEndsAt: next, status: "TRIALING" },
    });
    await prismaAdmin.shop.update({
      where: { id: parsed.data.shopId },
      data: { trialEndsAt: next },
    });

    await logAudit({
      action: "TRIAL_EXTENDED",
      actorUserId: actor,
      actorRole: "SUPER_ADMIN",
      shopId: parsed.data.shopId,
      targetTable: "subscription",
      targetId: sub.id,
      before: { trialEndsAt: sub.trialEndsAt },
      after: { trialEndsAt: next },
      reason: `+${parsed.data.days}d — ${parsed.data.reason}`,
    });
    revalidatePath(`/admin/tenants/${parsed.data.shopId}`);
    revalidatePath(`/admin`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Extend failed" };
  }
}
