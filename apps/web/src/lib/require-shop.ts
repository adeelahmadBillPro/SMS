import { redirect } from "next/navigation";
import { getPrimaryMembership, getSession, type AppMembership, type AppSession } from "./session";

/**
 * Resolve the signed-in user + their primary shop, or redirect to the
 * appropriate page. Returns a tuple you can destructure in Server
 * Components / Server Actions.
 *
 * Usage:
 *   const { session, membership } = await requireShop();
 */
export async function requireShop(): Promise<{ session: AppSession; membership: AppMembership }> {
  const session = await getSession();
  if (!session) redirect("/login");
  const membership = await getPrimaryMembership(session.userId);
  if (!membership) redirect("/onboarding");
  return { session, membership };
}
