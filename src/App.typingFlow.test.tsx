// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { WpmChart } from "@/components/WpmChart";
import { appStorage } from "@/lib/storage";

beforeAll(() => {
  if (typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

describe("Typing flow, Results, History, Onboarding & Unified Settings integration", () => {
  beforeEach(async () => {
    localStorage.clear();
    document.head.innerHTML = '<meta name="theme-color" content="#1c1917" />';
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-font");
    window.history.replaceState(null, "", "/");

    // Clear all keys from appStorage
    const keys = await appStorage.list("ttp:");
    await Promise.all(keys.map((k) => appStorage.delete(k)));
  });

  afterEach(() => {
    cleanup();
  });

  async function finishOnboarding(
    user: ReturnType<typeof userEvent.setup>,
    level: RegExp,
    startBtn: RegExp,
  ) {
    render(<App />);
    const dialog = await screen.findByRole("dialog", {}, { timeout: 4000 });
    await user.click(within(dialog).getByRole("button", { name: level }));
    await user.click(within(dialog).getByRole("button", { name: startBtn }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  }

  it("renders compact Practice layout, slim live strip, custom length, repeat same text, and unified settings", async () => {
    const user = userEvent.setup();
    await finishOnboarding(user, /Intermediate/i, /^Start practicing$/i);

    // Practice screen must NOT render DailyGoal block, Drill History accordion, tagline, or header Mode/Diff/Target chip
    expect(screen.queryByRole("button", { name: /Drill History/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Timed drills with live WPM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Mode:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart (Tab)" })).toBeInTheDocument();
    const idleMetrics = screen.getByRole("status", { name: "Live metrics" });
    expect(idleMetrics).toHaveTextContent(/\d+s\s*left/i);
    expect(idleMetrics).toHaveTextContent(/—\s*WPM/i);
    expect(idleMetrics).toHaveTextContent(/—%/i);
    expect(screen.getByRole("button", { name: /Daily goal/i })).toBeInTheDocument();

    // Skip to typing area link focuses typing input
    const skipLink = screen.getByRole("link", { name: /Skip to typing area/i });
    await user.click(skipLink);
    expect(document.activeElement).toBe(screen.getByLabelText("Typing input"));

    // 2. Switch to Words -> Custom 6w so the passage has a short finite length we can complete cleanly
    const modeGroup = screen.getByRole("group", { name: "Test mode" });
    await user.click(within(modeGroup).getByRole("button", { name: /^Words$/i }));
    await user.click(screen.getByRole("button", { name: /^Custom$/i }));
    const customInput = await screen.findByLabelText("Custom word count");
    await user.clear(customInput);
    await user.type(customInput, "6");
    await user.click(screen.getByRole("button", { name: /^Apply$/i }));
    expect(screen.getByRole("button", { name: /^6w$/i })).toHaveAttribute("aria-pressed", "true");

    const input = await screen.findByLabelText("Typing input");
    await waitFor(() =>
      expect(document.querySelectorAll("[data-char-index]").length).toBeGreaterThan(10),
    );

    const passageChars = Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    expect(passageChars.length).toBeGreaterThan(10);

    // 3. Type first char -> slim Live metrics strip stays visible; click Restart button to reset, then finish passage
    await user.click(input);
    await user.type(input, passageChars[0]!);
    expect(await screen.findByRole("status", { name: "Live metrics" })).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Restart (Tab)" }));
    const resetInput = await screen.findByLabelText("Typing input");
    await waitFor(() => expect((resetInput as HTMLInputElement).value).toBe(""));
    const restartedChars = Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    await user.click(resetInput);
    await user.type(resetInput, restartedChars);

    // 4. Verify ResultsPanel appears cleanly, Restart button hides, and aria-live announcer announced unlocked achievement
    const resultsSection = await screen.findByRole("region", { name: "Run results" });
    expect(resultsSection).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Restart/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Run finished:/i)).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Live metrics" })).toBeInTheDocument();
    expect(screen.queryByText(/Loosen up in Arcade/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("app-live-announcer")).toHaveTextContent(/achievements? unlocked/i);

    // 5. Repeat this text -> reuses exact same passage and marks result as repeated
    await user.click(within(resultsSection).getByRole("button", { name: /Repeat this text/i }));
    const repeatedChars = Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    expect(repeatedChars).toBe(restartedChars);

    const input2 = await screen.findByLabelText("Typing input");
    await user.click(input2);
    await user.type(input2, repeatedChars);
    const resultsSection2 = await screen.findByRole("region", { name: "Run results" });
    expect(
      within(resultsSection2).getByText(/Repeated text · excluded from PBs/i),
    ).toBeInTheDocument();

    // Primary nav shows Practice, Learn, Arcade, Stats, Achievements plus Settings gear
    const primaryNav = screen.getByRole("navigation", { name: "Primary sections" });
    expect(within(primaryNav).getByRole("button", { name: /^Practice$/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: /^Learn$/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: /^Arcade$/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: /^Stats$/i })).toBeInTheDocument();
    expect(within(primaryNav).getByRole("button", { name: /^Achievements/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open unified settings" })).toBeInTheDocument();

    // Arcade mode must NOT render HistoryPanel or full DailyGoal card
    await user.click(within(primaryNav).getByRole("button", { name: /^Arcade$/i }));
    expect(screen.queryByLabelText("Run history and progress")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Daily goal progress")).not.toBeInTheDocument();

    // Stats mode renders DailyGoal card, Summary tiles, Activity calendar, Heatmap, and Run history
    await user.click(within(primaryNav).getByRole("button", { name: /^Stats$/i }));
    const statsSection = await screen.findByRole("region", {
      name: "Statistics and practice progress",
    });
    expect(within(statsSection).getByLabelText("Daily goal progress")).toBeInTheDocument();
    expect(within(statsSection).getByLabelText("Summary statistics")).toBeInTheDocument();
    expect(within(statsSection).getByLabelText("Practice activity calendar")).toBeInTheDocument();
    expect(within(statsSection).getByLabelText("Lifetime keyboard heatmap")).toBeInTheDocument();
    expect(within(statsSection).getByLabelText("Run history and progress")).toBeInTheDocument();
    expect(
      within(statsSection).getByRole("button", { name: /Download history as CSV/i }),
    ).toBeInTheDocument();
    expect(document.title).toContain("Stats & Progress");

    // 6. Clicking header daily goal button opens Settings -> Typing
    await user.click(
      within(screen.getByRole("banner")).getByRole("button", { name: /Daily goal/i }),
    );
    const settingsSection = await screen.findByRole("region", { name: "Settings and privacy" });
    expect(settingsSection).toBeInTheDocument();
    expect(within(settingsSection).getByRole("tab", { name: /Typing/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(settingsSection).queryByText(/Timed Drill/i)).not.toBeInTheDocument();
    expect(
      within(settingsSection).getByRole("button", { name: /^Practice$/i }),
    ).toBeInTheDocument();

    await user.click(within(settingsSection).getByRole("tab", { name: /Appearance/i }));
    expect(within(settingsSection).queryByText(/WCAG/i)).not.toBeInTheDocument();
    await user.click(within(settingsSection).getByRole("button", { name: /High Contrast/i }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#000000",
    );

    const dyslexiaBtn = within(settingsSection).getByRole("button", { name: /Off|Enabled/i });
    await user.click(dyslexiaBtn);
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");

    const bootAfterChange = JSON.parse(localStorage.getItem("ttp:boot:v1") ?? "{}") as {
      theme?: string;
      dyslexiaFont?: boolean;
    };
    expect(bootAfterChange.theme).toBe("high-contrast");
    expect(bootAfterChange.dyslexiaFont).toBe(true);

    await user.click(within(settingsSection).getByRole("tab", { name: /Data & privacy/i }));
    expect(within(settingsSection).getByText(/ttp:history:index:v1/i)).toBeInTheDocument();
    expect(
      within(settingsSection).getByText(/100% Local-First Privacy Guarantee/i),
    ).toBeInTheDocument();
  }, 25000);

  it("offers Start Learn mode for Beginner onboarding and saves Learn lessons without altering PBs", async () => {
    const user = userEvent.setup();
    await finishOnboarding(user, /Beginner/i, /^Start Learn mode$/i);

    const learnSection = await screen.findByRole("region", { name: "Learn touch typing" });
    expect(learnSection).toBeInTheDocument();
    expect(screen.getByTestId("learn-unlocked-count")).toHaveTextContent("6/26 letters");

    const passageChars = Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    expect(passageChars).toMatch(/^[etaoin ]+$/);

    const input = await screen.findByLabelText("Typing input");
    await user.click(input);
    await user.type(input, passageChars);

    const learnResults = await screen.findByTestId("learn-results");
    expect(learnResults).toBeInTheDocument();

    // Learn runs appear in Stats -> History as Learn, but are excluded from Personal Bests table
    const primaryNav = screen.getByRole("navigation", { name: "Primary sections" });
    await user.click(within(primaryNav).getByRole("button", { name: /^Stats$/i }));
    const statsSection = await screen.findByRole("region", {
      name: "Statistics and practice progress",
    });
    expect(within(statsSection).getAllByText(/^Learn$/i).length).toBeGreaterThanOrEqual(2);
    expect(within(statsSection).getByLabelText("Summary statistics")).toHaveTextContent(
      /Best WPM\s*—/i,
    );
  }, 20000);

  it("renders Practice Progress title without Timed Drill in WpmChart", () => {
    render(<WpmChart samples={[10, 20, 30]} />);
    expect(screen.getByText("Practice Progress")).toBeInTheDocument();
    expect(screen.queryByText(/Timed Drill/i)).not.toBeInTheDocument();
  });

  it("requires two Esc presses within 1s mid-run (>10 chars) and shows press again to restart in metrics row", async () => {
    const user = userEvent.setup();
    await finishOnboarding(user, /Intermediate/i, /^Start practicing$/i);

    await user.click(screen.getByRole("button", { name: "Open unified settings" }));
    const quickRestartGroup = await screen.findByRole("group", { name: "Quick restart key" });
    await user.click(
      within(quickRestartGroup).getByRole("button", {
        name: "Esc",
      }),
    );
    await user.click(screen.getByRole("button", { name: /^Done$/i }));
    expect(screen.getByRole("button", { name: "Restart (Esc)" })).toBeInTheDocument();

    const input = await screen.findByLabelText("Typing input");
    const chars = Array.from(
      document.querySelectorAll("[data-char-index]"),
      (el) => el.textContent ?? "",
    ).join("");
    await user.click(input);
    await user.type(input, chars.slice(0, 11));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("status", { name: "Live metrics" })).toHaveTextContent(
      "press again to restart",
    );
    expect((input as HTMLInputElement).value).toHaveLength(11);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect((screen.getByLabelText("Typing input") as HTMLInputElement).value).toBe(""),
    );
  }, 20000);
});
