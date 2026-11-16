import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("full typing flow, zero external requests, unified settings, and backup export/import", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const thirdPartyRequests: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });
  page.on("request", (req) => {
    const url = req.url();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
        thirdPartyRequests.push(url);
      }
    }
  });

  await page.goto("/");

  // Verify accessible Onboarding Radix Dialog opens & can configure choices
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Beginner/i }).click();
  await dialog.getByRole("button", { name: /Start practicing/i }).click();
  await expect(dialog).toBeHidden();

  // Switch to Words -> 10w and type the generated passage
  await page
    .getByRole("group", { name: "Test mode" })
    .getByRole("button", { name: /^Words$/i })
    .click();
  await page.getByRole("button", { name: /^10w$/i }).click();

  const input = page.getByLabel("Typing input");
  await expect(input).toBeVisible();

  const passageText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
  });
  expect(passageText.length).toBeGreaterThan(15);

  await input.click();
  await input.pressSequentially(passageText, { delay: 15 });

  // Results screen must appear
  const results = page.getByRole("region", { name: "Run results" });
  await expect(results).toBeVisible();
  await expect(results.getByText(/WPM/i).first()).toBeVisible();

  // Drill History accordion should show 1 run and expand smoothly
  const historyToggle = page.getByRole("button", { name: /Drill History/i });
  await expect(historyToggle).toContainText("1 run");
  await historyToggle.click();
  await expect(historyToggle).toHaveAttribute("aria-expanded", "true");

  // Open unified Settings, switch theme to High Contrast & toggle OpenDyslexic
  await page.getByRole("button", { name: "Open unified settings" }).click();
  const settingsRegion = page.getByRole("region", { name: "Settings and privacy" });
  await expect(settingsRegion).toBeVisible();

  await settingsRegion.getByRole("tab", { name: /Appearance/i }).click();
  await settingsRegion.getByRole("button", { name: /High Contrast/i }).click();
  await expect(page.locator("html")).toHaveClass(/high-contrast/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");

  await settingsRegion.getByRole("button", { name: /Off|Enabled/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "opendyslexic");

  // Export backup JSON from Data & privacy tab, verify contents, then delete & re-import
  await settingsRegion.getByRole("tab", { name: /Data & privacy/i }).click();
  await expect(settingsRegion.getByText(/ttp:history:v1/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    settingsRegion.getByRole("button", { name: /Export Full Backup/i }).click(),
  ]);
  const downloadPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadPath);

  const backupJson = JSON.parse(fs.readFileSync(downloadPath, "utf8")) as {
    schemaVersion: number;
    history: unknown[];
    theme: string;
    uiPrefs: { dyslexiaFont: boolean };
  };
  expect(backupJson.schemaVersion).toBe(2);
  expect(backupJson.history.length).toBe(1);
  expect(backupJson.theme).toBe("high-contrast");
  expect(backupJson.uiPrefs.dyslexiaFont).toBe(true);

  // Import backup back via hidden file input cleanly
  await settingsRegion.locator('input[type="file"]').setInputFiles(downloadPath);
  await expect(page.getByText(/Restored full backup/i)).toBeVisible();

  // Verify PWA manifest & SEO tags are valid
  const manifestRes = await page.request.get("/manifest.webmanifest");
  expect(manifestRes.status()).toBe(200);
  const manifest = (await manifestRes.json()) as { name: string; icons: unknown[] };
  expect(manifest.name).toBe("Typing Trainer Pro");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

  expect(thirdPartyRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
