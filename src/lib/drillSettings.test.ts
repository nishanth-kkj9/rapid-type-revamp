// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_DRILL_SETTINGS,
  loadDrillSettings,
  saveDrillSettings,
  DRILL_SETTINGS_KEY,
  type DrillSettings,
} from "./drillSettings";

describe("drillSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default settings when storage is empty", () => {
    expect(loadDrillSettings()).toEqual(DEFAULT_DRILL_SETTINGS);
  });

  it("saves and loads custom drill settings", () => {
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
    saveDrillSettings(custom);
    expect(loadDrillSettings()).toEqual(custom);
  });

  it("sanitizes invalid or corrupted values", () => {
    localStorage.setItem(
      DRILL_SETTINGS_KEY,
      JSON.stringify({
        difficulty: "impossible",
        duration: 999,
        sound: "loud",
        caretStyle: "invisible",
        targetWpm: 9999,
        showLiveWpm: "yes",
        showKeyboard: "hidden",
      }),
    );
    const loaded = loadDrillSettings();
    expect(loaded.difficulty).toBe("medium");
    expect(loaded.duration).toBe(30);
    expect(loaded.sound).toBe("click");
    expect(loaded.caretStyle).toBe("smooth");
    expect(loaded.targetWpm).toBe(160); // clamped to slider ceiling
    expect(loaded.showLiveWpm).toBe(true);
    expect(loaded.showKeyboard).toBe(true);
    expect(loaded.focusWeakKeys).toBe(false);
  });

  it("persists the showKeyboard toggle", () => {
    saveDrillSettings({ ...DEFAULT_DRILL_SETTINGS, showKeyboard: false });
    expect(loadDrillSettings().showKeyboard).toBe(false);

    localStorage.setItem(
      DRILL_SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_DRILL_SETTINGS, showKeyboard: "invalid" }),
    );
    expect(loadDrillSettings().showKeyboard).toBe(true);
  });

  it("persists the focusWeakKeys toggle and sanitizes non-boolean values", () => {
    saveDrillSettings({ ...DEFAULT_DRILL_SETTINGS, focusWeakKeys: true });
    expect(loadDrillSettings().focusWeakKeys).toBe(true);

    localStorage.setItem(
      DRILL_SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_DRILL_SETTINGS, focusWeakKeys: "yes" }),
    );
    expect(loadDrillSettings().focusWeakKeys).toBe(false);
  });

  it("falls back to legacy difficulty key if new key not present", () => {
    localStorage.setItem("ttp:drill:diff:v1", "hard");
    const loaded = loadDrillSettings();
    expect(loaded.difficulty).toBe("hard");
  });
});
