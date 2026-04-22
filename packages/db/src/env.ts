import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

// Load .env from the repo root regardless of CWD.
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(__dirname, "../../../.env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Superuser connection — used by prisma migrate, rls-apply, and any step that
  // needs BYPASSRLS + role management. RLS tests MUST NOT use this URL.
  DATABASE_URL: required("DATABASE_URL"),
  // Tenant runtime — role shopos_app (no BYPASSRLS). RLS policies apply here.
  // The app's PrismaClient and the RLS proof test both connect via this URL.
  DATABASE_APP_URL: required("DATABASE_APP_URL"),
  // Admin runtime — role shopos_admin (BYPASSRLS). /admin routes + seed use this.
  DATABASE_ADMIN_URL: required("DATABASE_ADMIN_URL"),
  SHOPOS_APP_PASSWORD: optional("SHOPOS_APP_PASSWORD", "shopos_app_dev_pw"),
  SHOPOS_ADMIN_PASSWORD: optional("SHOPOS_ADMIN_PASSWORD", "shopos_admin_dev_pw"),
  SUPER_ADMIN_EMAIL: optional("SUPER_ADMIN_EMAIL", "adeel.ahmad8000@gmail.com"),
};
