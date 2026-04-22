"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { prismaAdmin, ShopMemberRole, SubscriptionStatus } from "@shopos/db";

export type SignupResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const TRIAL_DAYS = 14;

export async function signupAction(input: {
  email: string;
  password: string;
  shopName: string;
}): Promise<SignupResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  const { email, password, shopName } = parsed.data;

  try {
    const signup = await auth.api.signUpEmail({
      body: { email, password, name: email.split("@")[0] ?? email },
      headers: await headers(),
    });

    if (!signup?.user?.id) {
      return { ok: false, error: "Signup failed. Please try again." };
    }

    // Provision the tenant: shop + owner membership + trialing subscription.
    // Uses the admin client because shop / shop_member are global tables
    // and the trial subscription is being bootstrapped for a shop that
    // doesn't yet have an RLS-compatible session context.
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const monthlyPlan = await prismaAdmin.plan.findUnique({ where: { code: "single_monthly" } });
    if (!monthlyPlan) {
      // Seed ran? If not, this is a provisioning failure worth surfacing.
      return { ok: false, error: "Billing plans not initialized. Run `pnpm db:seed`." };
    }

    await prismaAdmin.shop.create({
      data: {
        name: shopName,
        trialEndsAt,
        members: { create: { userId: signup.user.id, role: ShopMemberRole.OWNER } },
        subscriptions: {
          create: {
            planId: monthlyPlan.id,
            status: SubscriptionStatus.TRIALING,
            trialEndsAt,
          },
        },
      },
    });

    return { ok: true, redirectTo: "/onboarding" };
  } catch (err) {
    const message =
      err instanceof Error && "message" in err
        ? err.message.includes("exists")
          ? "An account with this email already exists."
          : err.message
        : "Something went wrong. Please try again.";
    return { ok: false, error: message };
  }
}
