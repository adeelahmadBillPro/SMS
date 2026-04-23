import "server-only";
import { prismaAdmin } from "@shopos/db";
import { headers } from "next/headers";

/**
 * Append-only audit log writer for sensitive super-admin actions (and any
 * other action worth surviving an incident review). All writes go through
 * prismaAdmin — the audit_log table is global, scoped by shop_id column.
 *
 * Fail-loud by default: if the insert throws, the caller's transaction
 * still commits because we don't participate in it — audit failures don't
 * roll back business logic. We log to console so the row-write failure is
 * surfaced via Sentry.
 */
export interface AuditEntry {
  action: string;
  actorUserId: string;
  actorRole?: string | null;
  shopId?: string | null;
  impersonatedShopId?: string | null;
  targetTable?: string | null;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = h.get("user-agent");
  } catch {
    // Headers not available (e.g. during background tasks) — fine to skip.
  }

  try {
    await prismaAdmin.auditLog.create({
      data: {
        action: entry.action,
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole ?? null,
        shopId: entry.shopId ?? null,
        impersonatedShopId: entry.impersonatedShopId ?? null,
        targetTable: entry.targetTable ?? null,
        targetId: entry.targetId ?? null,
        before: entry.before == null ? undefined : (entry.before as object),
        after: entry.after == null ? undefined : (entry.after as object),
        ip,
        userAgent,
        reason: entry.reason ?? null,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] failed to write entry", { action: entry.action, err });
  }
}
