import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@shopos/db";

const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl,
  trustedOrigins: [appUrl],

  // Our Prisma model is AuthAccount (not Account — ledger Account already owns that name).
  account: { modelName: "authAccount" },

  // All rows use UUIDs to match our @db.Uuid schema.
  // "uuid" tells Better-Auth to use gen_random_uuid() on Postgres.
  advanced: {
    database: { generateId: "uuid" },
  },

  emailAndPassword: {
    enabled: true,
    // Phase 1: skip verification gate. We still send the link; user can verify later.
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.EMAIL_TRANSPORT === "console" || !process.env.EMAIL_TRANSPORT) {
        console.log("\n[dev email] Password reset");
        console.log(`  to:   ${user.email}`);
        console.log(`  link: ${url}\n`);
        return;
      }
      // TODO(M5+): Resend/SMTP transport.
      throw new Error("Email transport not wired yet — set EMAIL_TRANSPORT=console in dev.");
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days rolling
    updateAge: 60 * 60 * 24, // refresh stamp daily
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  // Must be last — auto-propagates Set-Cookie out of Server Actions.
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
