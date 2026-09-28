// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SHOOTER_SETTINGS,
  loadShooterSettings,
  saveShooterSettings,
  SETTINGS_KEY as KEY,
  type ShooterSettings,
} from "./shooterSettings";

describe("shooterSettings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default settings when storage is empty", () => {
    expect(loadShooterSettings()).toEqual(DEFAULT_SHOOTER_SETTINGS);
  });

  it("saves and loads custom shooter settings", () => {
    const custom: ShooterSettings = {
      difficulty: "hard",
      speedMultiplier: 1.8,
      startingLives: 5,
      soundEnabled: false,
    };
    saveShooterSettings(custom);
    expect(loadShooterSettings()).toEqual(custom);
  });

  it("sanitizes invalid or corrupted values", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        difficulty: "nightmare",
        speedMultiplier: "fast",
        startingLives: null,
        soundEnabled: "yes",
      }),
    );
    const loaded = loadShooterSettings();
    expect(loaded.difficulty).toBe("medium");
    expect(loaded.speedMultiplier).toBe(1.0);
    expect(loaded.startingLives).toBe(3);
    expect(loaded.soundEnabled).toBe(true);
  });

  it("clamps out-of-range numeric values to the UI bounds", () => {
    localStorage.setItem(KEY, JSON.stringify({ speedMultiplier: 99, startingLives: 50 }));
    expect(loadShooterSettings().speedMultiplier).toBe(2.5);
    expect(loadShooterSettings().startingLives).toBe(10);

    localStorage.setItem(KEY, JSON.stringify({ speedMultiplier: -5, startingLives: 0 }));
    expect(loadShooterSettings().speedMultiplier).toBe(0.5);
    expect(loadShooterSettings().startingLives).toBe(1);
  });

  it("rounds fractional lives and falls back to defaults on corrupted JSON", () => {
    localStorage.setItem(KEY, JSON.stringify({ startingLives: 7.6 }));
    expect(loadShooterSettings().startingLives).toBe(8);

    localStorage.setItem(KEY, "{not json");
    expect(loadShooterSettings()).toEqual(DEFAULT_SHOOTER_SETTINGS);
  });
});
