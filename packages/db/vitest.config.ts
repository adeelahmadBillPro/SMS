import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ["test/**/*.spec.ts"],
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    environment: "node",
  },
});
