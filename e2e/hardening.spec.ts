import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function dismissOnboarding(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /Welcome to TypingTrainerPro/i });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Start practicing/i }).click();
  await expect(dialog).toBeHidden();
}

test.describe("Phase 6 Hardening: CSP, Lazy Loading, Accessibility & Mobile", () => {
  test("fails on any CSP violation and verifies strict preview Content-Security-Policy header", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    await page.addInitScript(() => {
      window.addEventListener("securitypolicyviolation", (e) => {
        const w = window as unknown as { __cspViolations?: string[] };
        w.__cspViolations = [
          ...(w.__cspViolations ?? []),
          `${e.violatedDirective}: ${e.blockedURI}`,
        ];
      });
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const res = await page.goto("/?mode=drill");
    const csp = res?.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");

    await dismissOnboarding(page);

    // Exercise Practice, Learn, Arcade, Stats, Achievements, Settings
    const nav = page.getByRole("navigation", { name: "Primary sections" });
    for (const label of ["Learn", "Arcade", "Stats", "Achievements"]) {
      await nav.getByRole("button", { name: new RegExp(`^${label}`, "i") }).click();
    }
    await page.getByRole("button", { name: "Open unified settings" }).click();

    const violations = await page.evaluate(
      () => (window as unknown as { __cspViolations?: string[] }).__cspViolations ?? [],
    );
    expect(violations).toEqual([]);
    expect(consoleErrors.filter((c) => /content security policy|csp/i.test(c))).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("lazy-loads Stats, Learn, and Arcade chunks only when their tab is opened", async ({
    page,
  }) => {
    const loadedScripts: string[] = [];
    page.on("response", (res) => {
      const url = res.url();
      if (res.request().resourceType() === "script" && url.includes("/assets/")) {
        loadedScripts.push(url);
      }
    });

    // Skip onboarding so initial Practice load renders directly without loading Onboarding chunk
    await page.addInitScript(() => {
      window.localStorage.setItem("ttp:onboarded:v1", "1");
    });

    await page.goto("/?mode=drill");
    await expect(page.getByRole("navigation", { name: "Primary sections" })).toBeVisible();
    await expect(page.getByLabel("Typing input")).toBeVisible();

    const initialJoined = loadedScripts.join("\n");
    expect(initialJoined).not.toMatch(/StatsPage/i);
    expect(initialJoined).not.toMatch(/LearnScreen/i);
    expect(initialJoined).not.toMatch(/ShooterScreen/i);

    const nav = page.getByRole("navigation", { name: "Primary sections" });

    const beforeStats = loadedScripts.length;
    await nav.getByRole("button", { name: /^Stats$/i }).click();
    await expect(
      page.getByRole("region", { name: "Statistics and practice progress" }),
    ).toBeVisible();
    expect(loadedScripts.length).toBeGreaterThan(beforeStats);
    expect(loadedScripts.slice(beforeStats).join("\n")).toMatch(/StatsPage/i);

    const beforeLearn = loadedScripts.length;
    await nav.getByRole("button", { name: /^Learn$/i }).click();
    await expect(page.getByRole("region", { name: "Learn touch typing" })).toBeVisible();
    expect(loadedScripts.length).toBeGreaterThan(beforeLearn);
    expect(loadedScripts.slice(beforeLearn).join("\n")).toMatch(/LearnScreen/i);

    const beforeArcade = loadedScripts.length;
    await nav.getByRole("button", { name: /^Arcade$/i }).click();
    await expect(page.getByRole("button", { name: /Start Game|Launch/i })).toBeVisible();
    expect(loadedScripts.length).toBeGreaterThan(beforeArcade);
    expect(loadedScripts.slice(beforeArcade).join("\n")).toMatch(/ShooterScreen/i);
  });

  test("passes @axe-core/playwright across Practice, Learn, Arcade, Stats, Achievements, and Settings in dark, light, and high-contrast themes + Skip link focus", async ({
    page,
  }) => {
    await page.goto("/?mode=drill");
    await dismissOnboarding(page);

    // Verify Skip to typing area link moves focus to Typing input
    const skipLink = page.getByRole("link", { name: /Skip to typing area/i });
    await skipLink.focus();
    await expect(skipLink).toBeVisible();
    await skipLink.click();
    await expect(page.getByLabel("Typing input")).toBeFocused();

    const themes = ["dark", "light", "high-contrast"] as const;
    for (const theme of themes) {
      await page.evaluate((t) => {
        document.documentElement.classList.remove("light", "high-contrast");
        if (t !== "dark") document.documentElement.classList.add(t);
        document.documentElement.dataset.theme = t;
      }, theme);

      const nav = page.getByRole("navigation", { name: "Primary sections" });
      const screens: { name: string; open: () => Promise<void>; waitFor: () => Promise<void> }[] = [
        {
          name: "Practice",
          open: () => nav.getByRole("button", { name: /^Practice$/i }).click(),
          waitFor: () => expect(page.getByLabel("Typing input")).toBeVisible(),
        },
        {
          name: "Learn",
          open: () => nav.getByRole("button", { name: /^Learn$/i }).click(),
          waitFor: () =>
            expect(page.getByRole("region", { name: "Learn touch typing" })).toBeVisible(),
        },
        {
          name: "Arcade",
          open: () => nav.getByRole("button", { name: /^Arcade$/i }).click(),
          waitFor: () =>
            expect(page.getByRole("button", { name: /Start Game|Launch/i })).toBeVisible(),
        },
        {
          name: "Stats",
          open: () => nav.getByRole("button", { name: /^Stats$/i }).click(),
          waitFor: () =>
            expect(
              page.getByRole("region", { name: "Statistics and practice progress" }),
            ).toBeVisible(),
        },
        {
          name: "Achievements",
          open: () => nav.getByRole("button", { name: /^Achievements/i }).click(),
          waitFor: () => expect(page.getByRole("heading", { name: /Achievements/i })).toBeVisible(),
        },
        {
          name: "Settings",
          open: () => page.getByRole("button", { name: "Open unified settings" }).click(),
          waitFor: () =>
            expect(page.getByRole("region", { name: "Settings and privacy" })).toBeVisible(),
        },
      ];

      for (const screen of screens) {
        await screen.open();
        await screen.waitFor();
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        expect(
          results.violations,
          `Axe violations on ${screen.name} (${theme}): ${JSON.stringify(results.violations, null, 2)}`,
        ).toEqual([]);
      }
    }
  });

  test.describe("Mobile 390x844 touch viewport", () => {
    test.use({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });

    test("Practice and Learn have zero horizontal overflow, >=44px touch targets, and non-overlapping compact touch keyboard", async ({
      page,
    }) => {
      await page.goto("/?mode=drill");
      await dismissOnboarding(page);

      // Check Practice viewport overflow
      const practiceOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(practiceOverflow).toBeLessThanOrEqual(0);

      // Check CompactTouchKeyboard renders above TypingArea and does not overlap it
      const touchKb = page.getByTestId("compact-touch-keyboard");
      const typingArea = page.locator("#typing-area");
      await expect(touchKb).toBeVisible();
      await expect(typingArea).toBeVisible();

      const kbBox = await touchKb.boundingBox();
      const areaBox = await typingArea.boundingBox();
      expect(kbBox).not.toBeNull();
      expect(areaBox).not.toBeNull();
      expect(kbBox!.y + kbBox!.height).toBeLessThanOrEqual(areaBox!.y + 1);

      // Check 44px touch targets on Practice interactive buttons
      const practiceControls = page.locator(
        "header button:visible, nav button:visible, main button:visible",
      );
      const practiceCount = await practiceControls.count();
      expect(practiceCount).toBeGreaterThan(5);
      for (let i = 0; i < practiceCount; i++) {
        const btn = practiceControls.nth(i);
        const box = await btn.boundingBox();
        const label =
          (await btn.getAttribute("aria-label")) || (await btn.innerText()).trim() || `#${i}`;
        if (box) {
          expect(
            box.height,
            `Practice button "${label}" height ${box.height}px < 44px`,
          ).toBeGreaterThanOrEqual(44);
        }
      }

      // Switch to Learn and check zero overflow, non-overlapping compact touch keyboard, and >=44px touch targets
      await page
        .getByRole("navigation", { name: "Primary sections" })
        .getByRole("button", { name: /^Learn$/i })
        .click();
      const learnSection = page.getByRole("region", { name: "Learn touch typing" });
      await expect(learnSection).toBeVisible();

      const learnOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(learnOverflow).toBeLessThanOrEqual(0);

      await expect(touchKb).toBeVisible();
      const learnKbBox = await touchKb.boundingBox();
      const learnAreaBox = await typingArea.boundingBox();
      expect(learnKbBox).not.toBeNull();
      expect(learnAreaBox).not.toBeNull();
      expect(learnKbBox!.y + learnKbBox!.height).toBeLessThanOrEqual(learnAreaBox!.y + 1);

      const learnControls = page.locator("main button:visible");
      const learnCount = await learnControls.count();
      for (let i = 0; i < learnCount; i++) {
        const btn = learnControls.nth(i);
        const box = await btn.boundingBox();
        const label =
          (await btn.getAttribute("aria-label")) || (await btn.innerText()).trim() || `#${i}`;
        if (box) {
          expect(
            box.height,
            `Learn button "${label}" height ${box.height}px < 44px`,
          ).toBeGreaterThanOrEqual(44);
        }
      }

      const sliderBox = await learnSection.locator("#learn-target-wpm").boundingBox();
      expect(sliderBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    });
  });
});
