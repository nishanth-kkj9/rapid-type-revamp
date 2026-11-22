// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_KEY,
  applyDyslexiaFont,
  loadUiPrefsFromStorage,
  sanitizeUiPrefs,
  saveUiPrefsToStorage,
} from "./uiPrefs";
import { MemoryStorage } from "./storage";

describe("uiPrefs", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-font");
  });

  it("returns default prefs when storage is empty and omits removed smoothCaret/themeAccent keys", async () => {
    const storage = new MemoryStorage();
    const loaded = await loadUiPrefsFromStorage(storage);
    expect(loaded).toEqual(DEFAULT_UI_PREFS);
    expect("smoothCaret" in loaded).toBe(false);
    expect("themeAccent" in loaded).toBe(false);
    expect(loaded.dyslexiaFont).toBe(false);
  });

  it("reads old saved values containing legacy themeAccent and smoothCaret without error", async () => {
    const storage = new MemoryStorage();
    await storage.set(UI_PREFS_KEY, {
      heatmapMetric: "speed",
      smoothCaret: false,
      themeAccent: "violet",
      dyslexiaFont: true,
    });
    const loaded = await loadUiPrefsFromStorage(storage);
    expect(loaded).toEqual({ heatmapMetric: "speed", dyslexiaFont: true });
    expect("themeAccent" in loaded).toBe(false);
    expect("smoothCaret" in sanitizeUiPrefs({ smoothCaret: true })).toBe(false);
  });

  it("sanitizes invalid or corrupted storage values", async () => {
    const storage = new MemoryStorage();
    await storage.set(UI_PREFS_KEY, {
      heatmapMetric: "invalid_metric",
      themeAccent: "neon-yellow",
      dyslexiaFont: "yes",
    });
    expect(await loadUiPrefsFromStorage(storage)).toEqual(DEFAULT_UI_PREFS);
  });

  it("partially updates and merges preferences additively", async () => {
    const storage = new MemoryStorage();
    const saved = await saveUiPrefsToStorage(storage, { heatmapMetric: "speed" });
    expect(saved.heatmapMetric).toBe("speed");
    expect(saved.dyslexiaFont).toBe(false);

    await saveUiPrefsToStorage(storage, { dyslexiaFont: true });
    const finalState = await loadUiPrefsFromStorage(storage);
    expect(finalState.heatmapMetric).toBe("speed");
    expect(finalState.dyslexiaFont).toBe(true);
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");
  });

  it("applies dyslexia font to document element dataset", () => {
    applyDyslexiaFont(true);
    expect(document.documentElement.dataset["font"]).toBe("opendyslexic");
    applyDyslexiaFont(false);
    expect(document.documentElement.dataset["font"]).toBeUndefined();
  });

  it("handles malformed stored values gracefully", async () => {
    const storage = new MemoryStorage();
    await storage.set(UI_PREFS_KEY, "{broken");
    expect(await loadUiPrefsFromStorage(storage)).toEqual(DEFAULT_UI_PREFS);
  });
});
