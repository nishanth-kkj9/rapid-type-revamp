import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHOOTER_SETTINGS,
  loadShooterSettingsFromStorage,
  sanitizeShooterSettings,
  saveShooterSettingsToStorage,
  SETTINGS_KEY as KEY,
  type ShooterSettings,
} from "./shooterSettings";
import { MemoryStorage } from "./storage";

describe("shooterSettings", () => {
  it("returns default settings when storage is empty", async () => {
    const storage = new MemoryStorage();
    expect(await loadShooterSettingsFromStorage(storage)).toEqual(DEFAULT_SHOOTER_SETTINGS);
  });

  it("saves and loads custom shooter settings", async () => {
    const storage = new MemoryStorage();
    const custom: ShooterSettings = {
      difficulty: "hard",
      speedMultiplier: 1.8,
      startingLives: 5,
      soundEnabled: false,
      showKeyboard: false,
      practiceMode: true,
      dailyChallenge: true,
    };
    await saveShooterSettingsToStorage(storage, custom);
    expect(await loadShooterSettingsFromStorage(storage)).toEqual(custom);
  });

  it("sanitizes invalid or corrupted values", async () => {
    const storage = new MemoryStorage();
    await storage.set(KEY, {
      difficulty: "nightmare",
      speedMultiplier: "fast",
      startingLives: null,
      soundEnabled: "yes",
      showKeyboard: "disabled",
    });
    const loaded = await loadShooterSettingsFromStorage(storage);
    expect(loaded.difficulty).toBe("medium");
    expect(loaded.speedMultiplier).toBe(1.0);
    expect(loaded.startingLives).toBe(3);
    expect(loaded.soundEnabled).toBe(true);
    expect(loaded.showKeyboard).toBe(true);
  });

  it("persists the showKeyboard toggle", async () => {
    const storage = new MemoryStorage();
    await saveShooterSettingsToStorage(storage, {
      ...DEFAULT_SHOOTER_SETTINGS,
      showKeyboard: false,
    });
    expect((await loadShooterSettingsFromStorage(storage)).showKeyboard).toBe(false);
  });

  it("clamps out-of-range numeric values to the UI bounds", () => {
    const high = sanitizeShooterSettings({ speedMultiplier: 99, startingLives: 50 });
    expect(high.speedMultiplier).toBe(2.5);
    expect(high.startingLives).toBe(10);

    const low = sanitizeShooterSettings({ speedMultiplier: -5, startingLives: 0 });
    expect(low.speedMultiplier).toBe(0.5);
    expect(low.startingLives).toBe(1);
  });

  it("rounds fractional lives and falls back to defaults on corrupted values", async () => {
    expect(sanitizeShooterSettings({ startingLives: 7.6 }).startingLives).toBe(8);
    expect(sanitizeShooterSettings("{not json")).toEqual(DEFAULT_SHOOTER_SETTINGS);

    const storage = new MemoryStorage();
    await storage.set(KEY, "{not json");
    expect(await loadShooterSettingsFromStorage(storage)).toEqual(DEFAULT_SHOOTER_SETTINGS);
  });
});
