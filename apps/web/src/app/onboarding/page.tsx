import { redirect } from "next/navigation";
import { getPrimaryMembership, getSession } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

/**
 * Server shell — auth-checks before the client form mounts.
 *
 *   - Not signed in        → /login
 *   - Super-admin          → /admin (they don't need a shop to work)
 *   - Already has a shop   → /dashboard (onboarding done)
 *   - Regular user, no shop → show the form
 */
export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "SUPER_ADMIN") redirect("/admin");
  const membership = await getPrimaryMembership(session.userId);
  if (membership) redirect("/dashboard");
  return <OnboardingForm />;
}
