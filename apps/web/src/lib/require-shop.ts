import { redirect } from "next/navigation";
import { getPrimaryMembership, getSession, type AppMembership, type AppSession } from "./session";

/**
 * Resolve the signed-in user + their primary shop, or redirect to the
 * appropriate page. Returns a tuple you can destructure in Server
 * Components / Server Actions.
 *
 * Routing rules:
 *   - Not signed in            → /login
 *   - Super-admin, no shop     → /admin   (platform-only admin)
 *   - Regular user, no shop    → /onboarding (first-time shop setup)
 *   - Signed in WITH shop      → caller gets both session + membership
 *
 * Usage:
 *   const { session, membership } = await requireShop();
 */
export async function requireShop(): Promise<{ session: AppSession; membership: AppMembership }> {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await getPrimaryMembership(session.userId);
  if (!membership) {
    if (session.role === "SUPER_ADMIN") redirect("/admin");
    redirect("/onboarding");
  }
  return { session, membership };
}
