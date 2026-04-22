"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { resetCompleteSchema, resetRequestSchema } from "@/lib/validation";

export type ResetResult = { ok: true; message: string } | { ok: false; error: string };

export async function requestResetAction(input: { email: string }): Promise<ResetResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: "/reset-password",
      },
      headers: await headers(),
    });
  } catch {
    // Swallow errors — never reveal whether an email is registered.
  }

  return {
    ok: true,
    message: "If that email is in our system, a reset link is on its way. (In dev, the link prints to the server log.)",
  };
}

export async function completeResetAction(input: {
  token: string;
  password: string;
}): Promise<ResetResult> {
  const parsed = resetCompleteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
    return { ok: true, message: "Password updated. You can sign in now." };
  } catch {
    return { ok: false, error: "Reset link expired or invalid." };
  }
}
