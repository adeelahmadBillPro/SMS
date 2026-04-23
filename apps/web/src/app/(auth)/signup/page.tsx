"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field } from "@/components/ui/field";
import { signupAction } from "./action";

export default function SignupPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const fd = new FormData(e.currentTarget);
    const input = {
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
      shopName: String(fd.get("shopName") ?? ""),
    };

    startTransition(async () => {
      const res = await signupAction(input);
      if (res.ok) {
        router.push(res.redirectTo);
        router.refresh();
        return;
      }
      setFormError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    });
  }

  return (
    <>
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Create your shop</h1>
        <p className="text-sm text-slate-600">Start a 14-day trial · no card required</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="shopName" label="Shop name" error={fieldErrors.shopName}>
          <Input
            id="shopName"
            name="shopName"
            type="text"
            autoComplete="organization"
            placeholder="Liaqat Mobile Centre"
            error={Boolean(fieldErrors.shopName)}
            required
          />
        </Field>

        <Field id="email" label="Email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@shop.pk"
            error={Boolean(fieldErrors.email)}
            required
          />
        </Field>

        <Field
          id="password"
          label="Password"
          hint="10 characters minimum"
          error={fieldErrors.password}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            showStrength
            error={Boolean(fieldErrors.password)}
            required
          />
        </Field>

        {formError ? (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: [0, -4, 4, -2, 2, 0] }}
            transition={{ duration: 0.32 }}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {formError}
          </motion.div>
        ) : null}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </p>
    </>
  );
}
