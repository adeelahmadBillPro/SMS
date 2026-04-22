import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

// Load the monorepo-root .env so @shopos/db's env.ts resolves when
// Next.js evaluates modules at build time and during `next dev`.
loadEnv({ path: path.join(__dirname, "../../.env") });

// `output: "standalone"` is required for the Docker prod image (small,
// self-contained server bundle). On Windows the standalone copy step
// trips on turbopack chunk filenames that contain `:` (e.g.
// `[externals]_node:inspector_*.js`), which NTFS rejects. Those chunks
// only appear with OTEL-dependent packages (@sentry/nextjs). Gate on
// platform so Windows `pnpm build` still succeeds; Linux/Docker builds
// (CI + VPS) get the standalone output.
const isWindows = process.platform === "win32";

const config: NextConfig = {
  reactStrictMode: true,
  ...(isWindows ? {} : { output: "standalone" as const }),

  // Pin file tracing to the monorepo root so Next doesn't scan up into
  // Windows system junctions like "C:\Users\<u>\Application Data".
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Workspace packages emit raw TS; Next transpiles them.
  transpilePackages: ["@shopos/db", "@shopos/core"],
};

export default config;
