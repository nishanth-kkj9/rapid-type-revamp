import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone test config: unit tests are pure TS and must not boot the app's
// Vite plugin chain (TanStack Start, Nitro, MCP codegen). Loading those in CI
// is slow and can fail for reasons unrelated to the tests themselves.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: false,
    reporters: process.env["CI"] ? ["default", "github-actions"] : ["default"],
  },
});
