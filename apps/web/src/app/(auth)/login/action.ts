"use server";

import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function loginAction(input: { email: string; password: string }): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    return { ok: true, redirectTo: "/dashboard" };
  } catch (err) {
    if (err instanceof APIError) {
      return { ok: false, error: "Invalid email or password." };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
