// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import type { RolldownLog, RolldownLogWithString } from "rolldown";

export default defineConfig({
  plugins: [mcpPlugin()],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
    },
    build: {
      rollupOptions: {
        onwarn(
          warning: RolldownLog,
          defaultHandler: (warning: RolldownLogWithString | (() => RolldownLogWithString)) => void,
        ) {
          if (
            warning.code === "MODULE_LEVEL_DIRECTIVE" ||
            warning.message?.includes("use client")
          ) {
            return;
          }
          defaultHandler(warning);
        },
        output: {
          manualChunks(id: string): string | undefined {
            if (id.includes("node_modules/recharts")) return "charts";
            if (id.includes("node_modules/framer-motion")) return "motion";
            if (id.includes("node_modules/cmdk")) return "cmdk";
            return undefined;
          },
        },
      },
    },
  },
});
