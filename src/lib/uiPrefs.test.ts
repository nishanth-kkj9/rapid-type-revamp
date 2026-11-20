// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_UI_PREFS,
  UI_PREFS_KEY,
  applyDyslexiaFont,
  applyThemeAccent,
  loadUiPrefsFromStorage,
  sanitizeUiPrefs,
  saveUiPrefsToStorage,
} from "./uiPrefs";
import { MemoryStorage } from "./storage";

describe("uiPrefs", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.removeAttribute("data-font");
  });

  it("returns default prefs when storage is empty and omits removed smoothCaret key", async () => {
    const storage = new MemoryStorage();
    const loaded = await loadUiPrefsFromStorage(storage);
    expect(loaded).toEqual(DEFAULT_UI_PREFS);
    expect("smoothCaret" in loaded).toBe(false);
    expect(loaded.dyslexiaFont).toBe(false);
  });

  it("sanitizes invalid or corrupted storage values and strips legacy smoothCaret", async () => {
    const storage = new MemoryStorage();
    await storage.set(UI_PREFS_KEY, {
      heatmapMetric: "invalid_metric",
      smoothCaret: false,
      themeAccent: "neon-yellow",
      dyslexiaFont: "yes",
    });
    const loaded = await loadUiPrefsFromStorage(storage);
    expect(loaded).toEqual(DEFAULT_UI_PREFS);
    expect("smoothCaret" in sanitizeUiPrefs({ smoothCaret: true })).toBe(false);
  });

  it("partially updates and merges preferences additively", async () => {
    const storage = new MemoryStorage();
    const saved = await saveUiPrefsToStorage(storage, { heatmapMetric: "speed" });
    expect(saved.heatmapMetric).toBe("speed");
    expect(saved.themeAccent).toBe("amber");
    expect(saved.dyslexiaFont).toBe(false);

    const reloaded = await loadUiPrefsFromStorage(storage);
    expect(reloaded.heatmapMetric).toBe("speed");

    await saveUiPrefsToStorage(storage, { themeAccent: "emerald", dyslexiaFont: true });
    const finalState = await loadUiPrefsFromStorage(storage);
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

  it("handles malformed stored values gracefully", async () => {
    const storage = new MemoryStorage();
    await storage.set(UI_PREFS_KEY, "{broken");
    expect(await loadUiPrefsFromStorage(storage)).toEqual(DEFAULT_UI_PREFS);
  });
});
