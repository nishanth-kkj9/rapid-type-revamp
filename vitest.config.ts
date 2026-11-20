import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone test config: unit tests do not need the app's Vite build or PWA
// plugins. Keeping this isolated makes unit tests fast and deterministic.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
    passWithNoTests: false,
    reporters: process.env["CI"] ? ["default", "github-actions"] : ["default"],
  },
});
