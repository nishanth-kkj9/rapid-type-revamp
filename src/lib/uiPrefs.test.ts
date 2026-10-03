// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_KEY,
  applyThemeAccent,
  clearUiPrefs,
  loadUiPrefs,
  saveUiPrefs,
} from "./uiPrefs";

describe("uiPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-accent");
  });

  it("returns default prefs when storage is empty", () => {
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
  });

  it("sanitizes invalid or corrupted storage values", () => {
    localStorage.setItem(
      UI_PREFS_KEY,
      JSON.stringify({
        heatmapMetric: "invalid_metric",
        smoothCaret: "not-a-boolean",
        themeAccent: "neon-yellow",
      }),
    );
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
  });

  it("partially updates and merges preferences additively", () => {
    const saved = saveUiPrefs({ heatmapMetric: "speed" });
    expect(saved.heatmapMetric).toBe("speed");
    expect(saved.smoothCaret).toBe(true);
    expect(saved.themeAccent).toBe("amber");

    const reloaded = loadUiPrefs();
    expect(reloaded.heatmapMetric).toBe("speed");
    expect(reloaded.smoothCaret).toBe(true);

    saveUiPrefs({ smoothCaret: false, themeAccent: "emerald" });
    const finalState = loadUiPrefs();
    expect(finalState.heatmapMetric).toBe("speed");
    expect(finalState.smoothCaret).toBe(false);
    expect(finalState.themeAccent).toBe("emerald");
    expect(document.documentElement.dataset["accent"]).toBe("emerald");
  });

  it("applies theme accent to document element dataset", () => {
    applyThemeAccent("cyan");
    expect(document.documentElement.dataset["accent"]).toBe("cyan");
  });

  it("handles invalid json in storage gracefully", () => {
    localStorage.setItem(UI_PREFS_KEY, "{broken");
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
  });

  it("clears preferences correctly", () => {
    saveUiPrefs({ heatmapMetric: "speed", themeAccent: "violet" });
    clearUiPrefs();
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
    expect(localStorage.getItem(UI_PREFS_KEY)).toBeNull();
  });
});
