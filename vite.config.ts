import { gzipSync } from "node:zlib";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

const CSP_HEADER =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'";

const MAIN_BUNDLE_GZIP_BUDGET_BYTES = 250 * 1024;

function mainChunkSizeBudgetPlugin(): Plugin {
  return {
    name: "ttp-main-chunk-budget",
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk" && item.isEntry) {
          const gzippedBytes = gzipSync(item.code).byteLength;
          const gzippedKb = (gzippedBytes / 1024).toFixed(2);
          if (gzippedBytes > MAIN_BUNDLE_GZIP_BUDGET_BYTES) {
            this.warn(
              `Main entry chunk "${item.fileName}" is ${gzippedKb} kB gzipped, exceeding the 250 kB budget.`,
            );
          } else {
            console.log(
              `[bundle-budget] ${item.fileName}: ${gzippedKb} kB gzipped (budget: 250.00 kB)`,
            );
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    react(),
    mainChunkSizeBudgetPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "boot.js",
        "favicon.ico",
        "icon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png",
        "og-image.png",
        "og-image.svg",
        "robots.txt",
      ],
      manifest: {
        id: "/",
        name: "Typing Trainer Pro",
        short_name: "TypeTrainer",
        description:
          "Local-first typing trainer with timed drills, Word Shooter arcade mode, per-key heatmap, and adaptive weak-key practice.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#1c1917",
        theme_color: "#1c1917",
        categories: ["education", "utilities", "games"],
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    headers: {
      "Content-Security-Policy": CSP_HEADER,
    },
  },
  build: {
    assetsInlineLimit(filePath: string): boolean | undefined {
      if (/\.(woff2?|ttf|otf|eot)(\?.*)?$/i.test(filePath)) {
        return false;
      }
      return undefined;
    },
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes("node_modules/cmdk")) return "cmdk";
          return undefined;
        },
      },
    },
  },
});
