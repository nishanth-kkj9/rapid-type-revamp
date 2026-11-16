// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
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
    document.documentElement.removeAttribute("data-accent");
    window.history.replaceState(null, "", "/");

    // Clear all keys from appStorage
    const keys = await appStorage.list("ttp:");
    await Promise.all(keys.map((k) => appStorage.delete(k)));
  });

  afterEach(() => {
    cleanup();
  });

  it("completes onboarding, types a 10-word drill to completion, shows results & history, and switches unified settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    // 1. Accessible Onboarding Radix dialog opens for first-time user
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Current typing pace/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Beginner/i }));
    await user.click(screen.getByRole("button", { name: /^Start practicing$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 2. Switch to Words -> 10w so the passage has an exact finite length we can complete cleanly
    const modeGroup = screen.getByRole("group", { name: "Test mode" });
    await user.click(within(modeGroup).getByRole("button", { name: /^Words$/i }));
    await user.click(screen.getByRole("button", { name: /^10w$/i }));

    // Wait for input and passage characters
    const input = await screen.findByLabelText("Typing input");
    await waitFor(() => {
      expect(document.querySelectorAll("[data-char-index]").length).toBeGreaterThan(10);
    });

    const passageChars = Array.from(document.querySelectorAll("[data-char-index]"))
      .map((el) => el.textContent ?? "")
      .join("");
    expect(passageChars.length).toBeGreaterThan(10);

    // 3. Type every character into the drill input
    await user.click(input);
    await user.type(input, passageChars);

    // 4. Verify ResultsPanel appears with metrics & live announcement
    const resultsSection = await screen.findByRole("region", { name: "Run results" });
    expect(resultsSection).toBeInTheDocument();
    expect(screen.getByText(/Run finished:/i)).toBeInTheDocument();

    // 5. Verify History entry persisted and expands cleanly
    const historyBtn = await screen.findByRole("button", { name: /Drill History/i });
    await waitFor(() => {
      expect(historyBtn.textContent).toMatch(/1\s+run/);
    });
    await user.click(historyBtn);
    expect(historyBtn).toHaveAttribute("aria-expanded", "true");

    // 6. Open unified Settings page and verify Appearance & Data/Privacy tabs
    await user.click(screen.getByRole("button", { name: "Open unified settings" }));
    const settingsSection = await screen.findByRole("region", { name: "Settings and privacy" });
    expect(settingsSection).toBeInTheDocument();

    await user.click(within(settingsSection).getByRole("tab", { name: /Appearance/i }));
    await user.click(within(settingsSection).getByRole("button", { name: /High Contrast/i }));
    expect(document.documentElement.classList.contains("high-contrast")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#000000",
    );

    const dyslexiaBtn = within(settingsSection).getByRole("button", { name: /Off|Enabled/i });
    await user.click(dyslexiaBtn);
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");

    await user.click(within(settingsSection).getByRole("tab", { name: /Data & privacy/i }));
    expect(within(settingsSection).getByText(/ttp:history:v1/i)).toBeInTheDocument();
    expect(
      within(settingsSection).getByText(/100% Local-First Privacy Guarantee/i),
    ).toBeInTheDocument();
  }, 20000);
});
