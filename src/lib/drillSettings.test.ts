import { describe, expect, it } from "vitest";
import {
  DEFAULT_DRILL_SETTINGS,
  DRILL_SETTINGS_KEY,
  getQuickRestart,
  loadDrillSettingsFromStorage,
  sanitizeDrillSettings,
  saveDrillSettingsToStorage,
  type DrillSettings,
} from "./drillSettings";
import { MemoryStorage } from "./storage";

describe("drillSettings", () => {
  it("returns default settings when storage is empty", async () => {
    const storage = new MemoryStorage();
    expect(await loadDrillSettingsFromStorage(storage)).toEqual(DEFAULT_DRILL_SETTINGS);
  });

  it("saves and loads custom drill settings", async () => {
    const storage = new MemoryStorage();
    const custom: DrillSettings = {
      difficulty: "hard",
      duration: 60,
      sound: "beep",
      caretStyle: "block",
      targetWpm: 95,
      showLiveWpm: false,
      showKeyboard: false,
      focusWeakKeys: false,
    };
    await saveDrillSettingsToStorage(storage, custom);
    expect(await loadDrillSettingsFromStorage(storage)).toEqual(custom);
  });

  it("sanitizes invalid or corrupted values", async () => {
    const storage = new MemoryStorage();
    await storage.set(DRILL_SETTINGS_KEY, {
      difficulty: "impossible",
      duration: 999,
      sound: "loud",
      caretStyle: "invisible",
      targetWpm: 9999,
      showLiveWpm: "yes",
      showKeyboard: "hidden",
    });
    const loaded = await loadDrillSettingsFromStorage(storage);
    expect(loaded.difficulty).toBe("medium");
    expect(loaded.duration).toBe(30);
    expect(loaded.sound).toBe("click");
    expect(loaded.caretStyle).toBe("smooth");
    expect(loaded.targetWpm).toBe(160); // clamped to slider ceiling
    expect(loaded.showLiveWpm).toBe(true);
    expect(loaded.showKeyboard).toBe(true);
    expect(loaded.focusWeakKeys).toBe(false);
  });

  it("persists the showKeyboard toggle", async () => {
    const storage = new MemoryStorage();
    await saveDrillSettingsToStorage(storage, { ...DEFAULT_DRILL_SETTINGS, showKeyboard: false });
    expect((await loadDrillSettingsFromStorage(storage)).showKeyboard).toBe(false);

    expect(
      sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, showKeyboard: "invalid" }).showKeyboard,
    ).toBe(true);
  });

  it("persists the focusWeakKeys toggle and sanitizes non-boolean values", async () => {
    const storage = new MemoryStorage();
    await saveDrillSettingsToStorage(storage, { ...DEFAULT_DRILL_SETTINGS, focusWeakKeys: true });
    expect((await loadDrillSettingsFromStorage(storage)).focusWeakKeys).toBe(true);

    expect(
      sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, focusWeakKeys: "yes" }).focusWeakKeys,
    ).toBe(false);
  });

  it("validates custom durations (5-600s step 5) and word counts (5-500)", () => {
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, duration: 45 }).duration).toBe(45);
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, duration: 600 }).duration).toBe(600);
    // Out-of-range or off-step durations fall back to default 30s
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, duration: 12 }).duration).toBe(30);
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, duration: 605 }).duration).toBe(30);

    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, wordCount: 5 }).wordCount).toBe(5);
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, wordCount: 75 }).wordCount).toBe(75);
    expect(sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, wordCount: 500 }).wordCount).toBe(
      500,
    );
    expect(
      sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, wordCount: 2 }).wordCount,
    ).toBeUndefined();
    expect(
      sanitizeDrillSettings({ ...DEFAULT_DRILL_SETTINGS, wordCount: 501 }).wordCount,
    ).toBeUndefined();
  });

  it("persists strictMode and paceCaret and sanitizes invalid values", async () => {
    const storage = new MemoryStorage();
    await saveDrillSettingsToStorage(storage, {
      ...DEFAULT_DRILL_SETTINGS,
      strictMode: "word",
      paceCaret: "pb",
    });
    const loaded = await loadDrillSettingsFromStorage(storage);
    expect(loaded.strictMode).toBe("word");
    expect(loaded.paceCaret).toBe("pb");

    const sanitized = sanitizeDrillSettings({
      ...DEFAULT_DRILL_SETTINGS,
      strictMode: "super-strict",
      paceCaret: "avg",
    });
    expect(sanitized.strictMode).toBeUndefined();
    expect(sanitized.paceCaret).toBeUndefined();
  });

  it("defaults quickRestart to tab for new users while preserving saved and legacy choices", async () => {
    const storage = new MemoryStorage();
    expect((await loadDrillSettingsFromStorage(storage)).quickRestart).toBe("tab");

    await storage.set(DRILL_SETTINGS_KEY, { difficulty: "medium", duration: 30 });
    expect(getQuickRestart(await loadDrillSettingsFromStorage(storage))).toBe("esc");

    await saveDrillSettingsToStorage(storage, { ...DEFAULT_DRILL_SETTINGS, quickRestart: "enter" });
    expect((await loadDrillSettingsFromStorage(storage)).quickRestart).toBe("enter");

    expect(sanitizeDrillSettings({ tabToRestart: true }).quickRestart).toBe("tab");
    expect(sanitizeDrillSettings({ tabToRestart: false }).quickRestart).toBe("esc");
    expect(sanitizeDrillSettings({ quickRestart: "space" }).quickRestart).toBeUndefined();
  });
});
