"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field } from "@/components/ui/field";
import { completeResetAction, requestResetAction } from "./action";

export function ResetFormSwitch() {
  const params = useSearchParams();
  const token = params.get("token");
  return token ? <CompleteReset token={token} /> : <RequestReset />;
}

function RequestReset() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await requestResetAction({ email: String(fd.get("email") ?? "") });
      if (res.ok) setMessage(res.message);
      else setError(res.error);
    });
  }

  return (
    <>
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="text-sm text-slate-600">We&apos;ll email you a secure link.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="email" label="Email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700"
          >
            {message}
          </motion.div>
        ) : null}
        {error ? (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: [0, -4, 4, -2, 2, 0] }}
            transition={{ duration: 0.32 }}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </motion.div>
        ) : null}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

function CompleteReset({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await completeResetAction({
        token,
        password: String(fd.get("password") ?? ""),
      });
      if (res.ok) {
        router.push("/login");
        router.refresh();
        return;
      }
      setError(res.error);
    });
  }

  return (
    <>
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
        <p className="text-sm text-slate-600">At least 10 characters</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field id="password" label="New password">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            showStrength
            required
          />
        </Field>

        {error ? (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: [0, -4, 4, -2, 2, 0] }}
            transition={{ duration: 0.32 }}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          >
            {error}
          </motion.div>
        ) : null}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </>
  );
}
