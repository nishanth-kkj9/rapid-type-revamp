import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("full typing flow, zero external requests, Learn lesson, export, delete-all, and import backup", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const thirdPartyRequests: string[] = [];
  const cspViolations: string[] = [];

  await page.addInitScript(() => {
    window.addEventListener("securitypolicyviolation", (e) => {
      const prev = (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [];
      prev.push(`${e.violatedDirective}: ${e.blockedURI}`);
      (window as unknown as { __cspViolations?: string[] }).__cspViolations = prev;
    });
  });

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

  const navRes = await page.goto("/");
  expect(navRes?.headers()["content-security-policy"]).toContain("default-src 'self'");

  // Verify accessible Onboarding Radix Dialog opens & can configure choices
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Intermediate/i }).click();
  await dialog.getByRole("button", { name: /Start practicing/i }).click();
  await expect(dialog).toBeHidden();

  // Practice screen must not show Drill History accordion or idle stat cards, and must show the header daily goal chip
  await expect(page.getByRole("button", { name: /Drill History/i })).toBeHidden();
  await expect(page.getByRole("status", { name: "Live metrics" })).toBeHidden();
  await expect(page.getByRole("button", { name: /Daily goal/i })).toBeVisible();

  // Switch to Words -> 10w and type the generated passage (First run)
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
  await input.pressSequentially(passageText.slice(0, 3), { delay: 15 });
  await expect(page.getByRole("status", { name: "Live metrics" })).toBeVisible();
  await input.pressSequentially(passageText.slice(3), { delay: 15 });

  // Results screen must appear without slim live strip or removed Arcade nudge
  const results = page.getByRole("region", { name: "Run results" });
  await expect(results).toBeVisible();
  await expect(results.getByText(/WPM/i).first()).toBeVisible();
  await expect(page.getByRole("status", { name: "Live metrics" })).toBeHidden();
  await expect(page.getByText(/Loosen up in Arcade/i)).toBeHidden();

  // Repeat this text must reuse the exact same passage and tag result as repeated
  await results.getByRole("button", { name: /Repeat this text/i }).click();
  const repeatedText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
  });
  expect(repeatedText).toBe(passageText);

  await input.click();
  await input.pressSequentially(repeatedText, { delay: 12 });
  await expect(results).toBeVisible();
  await expect(results.getByText(/Repeated text · excluded from PBs/i)).toBeVisible();

  // Verify Primary nav has Practice · Learn · Arcade · Stats · Achievements
  const primaryNav = page.getByRole("navigation", { name: "Primary sections" });
  const practiceBtn = primaryNav.getByRole("button", { name: /^Practice$/i });
  await expect(practiceBtn).toHaveAttribute("aria-pressed", "true");
  await expect(primaryNav.getByRole("button", { name: /^Learn$/i })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: /^Arcade$/i })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: /^Stats$/i })).toBeVisible();
  await expect(primaryNav.getByRole("button", { name: /^Achievements/i })).toBeVisible();

  // Navigate to Stats page and check DailyGoal, 26-week calendar, heatmap, and CSV export
  await primaryNav.getByRole("button", { name: /^Stats$/i }).click();
  await expect(page).toHaveTitle(/Stats & Progress/i);
  const statsSection = page.getByRole("region", { name: "Statistics and practice progress" });
  await expect(statsSection).toBeVisible();
  await expect(statsSection.getByLabel("Daily goal progress")).toBeVisible();
  await expect(statsSection.getByLabel("Summary statistics")).toBeVisible();
  await expect(
    statsSection.getByRole("region", { name: "Practice activity calendar" }),
  ).toBeVisible();
  await expect(
    statsSection.getByRole("grid", { name: /Practice activity calendar/i }),
  ).toBeVisible();
  await expect(statsSection.getByLabel("Lifetime keyboard heatmap")).toBeVisible();
  await expect(statsSection.getByLabel("Run history and progress")).toBeVisible();

  // Stats history actions must NOT expose Import or Delete All Data
  await expect(statsSection.getByRole("button", { name: /Import/i })).toBeHidden();
  await expect(statsSection.getByRole("button", { name: /Delete All/i })).toBeHidden();

  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    statsSection.getByRole("button", { name: /Download history as CSV/i }).click(),
  ]);
  const csvPath = testInfo.outputPath(csvDownload.suggestedFilename());
  await csvDownload.saveAs(csvPath);
  const csvLines = fs.readFileSync(csvPath, "utf8").trim().split("\n");
  expect(csvLines.length).toBe(3); // 1 header + 2 runs

  // Complete a Learn lesson as part of the clean-profile journey
  await primaryNav.getByRole("button", { name: /^Learn$/i }).click();
  await expect(page).toHaveTitle(/Learn Touch Typing/i);
  const learnRegion = page.getByRole("region", { name: "Learn touch typing" });
  await expect(learnRegion).toBeVisible();
  const learnPassage = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
  });
  expect(learnPassage).toMatch(/^[etaoin ]+$/);
  const learnInput = page.getByLabel("Typing input");
  await learnInput.click();
  await learnInput.pressSequentially(learnPassage, { delay: 5 });
  await expect(page.getByTestId("learn-results")).toBeVisible();

  // Open unified Settings, switch to Light + Violet accent + OpenDyslexic
  await page.getByRole("button", { name: "Open unified settings" }).click();
  const settingsRegion = page.getByRole("region", { name: "Settings and privacy" });
  await expect(settingsRegion).toBeVisible();

  await settingsRegion.getByRole("tab", { name: /Appearance/i }).click();
  await settingsRegion.getByRole("button", { name: /^Light\b/i }).click();
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f8f7f4");

  await settingsRegion.getByRole("radio", { name: /Violet/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");

  await settingsRegion.getByRole("button", { name: /Off|Enabled/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "opendyslexic");

  // Reload while OS prefers dark color scheme and verify pre-paint /boot.js sets light/violet/opendyslexic immediately
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "domcontentloaded" });
  const preHydrationAttrs = await page.evaluate(() => ({
    hasLight: document.documentElement.classList.contains("light"),
    theme: document.documentElement.dataset.theme,
    accent: document.documentElement.dataset.accent,
    font: document.documentElement.dataset.font,
  }));
  expect(preHydrationAttrs).toEqual({
    hasLight: true,
    theme: "light",
    accent: "violet",
    font: "opendyslexic",
  });

  // Reloaded at ?mode=settings — verify Settings remains open, then switch to Data & privacy tab
  await expect(settingsRegion).toBeVisible();
  await settingsRegion.getByRole("tab", { name: /Data & privacy/i }).click();
  await expect(settingsRegion.getByText(/ttp:history:index:v1/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    settingsRegion.getByRole("button", { name: /Export Full Backup/i }).click(),
  ]);
  const downloadPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadPath);

  const backupJson = JSON.parse(fs.readFileSync(downloadPath, "utf8")) as {
    schemaVersion: number;
    history: { repeated?: boolean; mode: string }[];
    theme: string;
    uiPrefs: { themeAccent: string; dyslexiaFont: boolean };
  };
  expect(backupJson.schemaVersion).toBe(2);
  expect(backupJson.history.length).toBe(3);
  expect(backupJson.history.some((h) => h.repeated === true)).toBe(true);
  expect(backupJson.history.some((h) => h.mode === "learn")).toBe(true);
  expect(backupJson.theme).toBe("light");
  expect(backupJson.uiPrefs.themeAccent).toBe("violet");
  expect(backupJson.uiPrefs.dyslexiaFont).toBe(true);

  // Delete All Data cleanly and verify wiped state + boot prefs removal
  await settingsRegion.getByRole("button", { name: /Delete All Data/i }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByPlaceholder("DELETE").fill("DELETE");
  await deleteDialog.getByRole("button", { name: /Delete all my data/i }).click();
  await expect(deleteDialog).toBeHidden();
  await expect(settingsRegion.getByText(/0 runs/i)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ttp:boot:v1"))).toBeNull();

  // Import backup back via hidden file input and confirm 3 runs & theme preferences restore
  await settingsRegion.locator('input[type="file"]').setInputFiles(downloadPath);
  await expect(page.getByText(/Restored full backup \(3 runs/i)).toBeVisible();
  await expect(settingsRegion.getByText(/3 runs/i)).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/light/);
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
  await expect(page.locator("html")).toHaveAttribute("data-font", "opendyslexic");

  // Verify PWA manifest is valid
  const manifestRes = await page.request.get("/manifest.webmanifest");
  expect(manifestRes.status()).toBe(200);
  const manifest = (await manifestRes.json()) as { name: string; icons: unknown[] };
  expect(manifest.name).toBe("Typing Trainer Pro");
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

  const pageCspViolations = await page.evaluate(
    () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
  );
  cspViolations.push(...pageCspViolations);

  expect(cspViolations).toEqual([]);
  expect(thirdPartyRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Beginner onboarding launches Learn mode, displays 6/26 unlocked keys, and completes a lesson", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Beginner/i }).click();
  const startLearn = dialog.getByRole("button", { name: /Start Learn mode/i });
  await expect(startLearn).toBeVisible();
  await startLearn.click();
  await expect(dialog).toBeHidden();

  await expect(page).toHaveTitle(/Learn Touch Typing/i);
  const learnRegion = page.getByRole("region", { name: "Learn touch typing" });
  await expect(learnRegion).toBeVisible();
  await expect(learnRegion.getByTestId("learn-unlocked-count")).toHaveText("6/26 letters");

  // Type the full generated Learn lesson (unlocked letters only)
  const passage = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
  });
  expect(passage).toMatch(/^[etaoin ]+$/);

  const input = page.getByLabel("Typing input");
  await input.click();
  await input.pressSequentially(passage, { delay: 5 });

  await expect(page.getByTestId("learn-results")).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
