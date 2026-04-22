import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { NextConfig } from "next";

// Load the monorepo-root .env so @shopos/db's env.ts resolves when
// Next.js evaluates modules at build time and during `next dev`.
loadEnv({ path: path.join(__dirname, "../../.env") });

const config: NextConfig = {
  reactStrictMode: true,
  output: "standalone",

  // Pin file tracing to the monorepo root so Next doesn't scan up into
  // Windows system junctions like "C:\Users\<u>\Application Data".
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Workspace packages emit raw TS; Next transpiles them.
  transpilePackages: ["@shopos/db"],
};

export default config;
