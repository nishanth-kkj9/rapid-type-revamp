import fs from "node:fs";
import { chromium, defineConfig, devices } from "@playwright/test";

const FALLBACK_HEADLESS_SHELL =
  "/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell";
const defaultExecutable = chromium.executablePath();
const executablePath =
  !fs.existsSync(defaultExecutable) && fs.existsSync(FALLBACK_HEADLESS_SHELL)
    ? FALLBACK_HEADLESS_SHELL
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: process.env["CI"] ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    acceptDownloads: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env["CI"],
    timeout: 60000,
  },
});
