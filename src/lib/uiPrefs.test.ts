// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_KEY,
  applyDyslexiaFont,
  applyThemeAccent,
  clearUiPrefs,
  loadUiPrefs,
  sanitizeUiPrefs,
  saveUiPrefs,
} from "./uiPrefs";

describe("uiPrefs", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-font");
  });

  it("returns default prefs when storage is empty and omits removed smoothCaret key", () => {
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
    expect("smoothCaret" in loadUiPrefs()).toBe(false);
    expect(loadUiPrefs().dyslexiaFont).toBe(false);
  });

  it("sanitizes invalid or corrupted storage values and strips legacy smoothCaret", () => {
    localStorage.setItem(
      UI_PREFS_KEY,
      JSON.stringify({
        heatmapMetric: "invalid_metric",
        smoothCaret: false,
        themeAccent: "neon-yellow",
        dyslexiaFont: "yes",
      }),
    );
    const loaded = loadUiPrefs();
    expect(loaded).toEqual(DEFAULT_UI_PREFS);
    expect("smoothCaret" in sanitizeUiPrefs({ smoothCaret: true })).toBe(false);
  });

  it("partially updates and merges preferences additively", () => {
    const saved = saveUiPrefs({ heatmapMetric: "speed" });
    expect(saved.heatmapMetric).toBe("speed");
    expect(saved.themeAccent).toBe("amber");
    expect(saved.dyslexiaFont).toBe(false);

    const reloaded = loadUiPrefs();
    expect(reloaded.heatmapMetric).toBe("speed");

    saveUiPrefs({ themeAccent: "emerald", dyslexiaFont: true });
    const finalState = loadUiPrefs();
    expect(finalState.heatmapMetric).toBe("speed");
    expect(finalState.themeAccent).toBe("emerald");
    expect(finalState.dyslexiaFont).toBe(true);
    expect(document.documentElement.dataset["accent"]).toBe("emerald");
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");
  });

  it("applies theme accent and dyslexia font to document element dataset", () => {
    applyThemeAccent("cyan");
    expect(document.documentElement.dataset["accent"]).toBe("cyan");
    applyDyslexiaFont(true);
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");
    applyDyslexiaFont(false);
    expect(document.documentElement.dataset["font"]).toBeUndefined();
  });

  it("handles invalid json in storage gracefully", () => {
    localStorage.setItem(UI_PREFS_KEY, "{broken");
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
  });

  it("clears preferences correctly", () => {
    saveUiPrefs({ heatmapMetric: "speed", themeAccent: "violet", dyslexiaFont: true });
    clearUiPrefs();
    expect(loadUiPrefs()).toEqual(DEFAULT_UI_PREFS);
    expect(localStorage.getItem(UI_PREFS_KEY)).toBeNull();
  });
});
