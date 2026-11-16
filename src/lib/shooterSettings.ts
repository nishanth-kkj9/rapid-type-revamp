import { z } from "zod";
import type { Difficulty } from "@/lib/sentenceGenerator";
import type { Storage } from "./storage";

export interface ShooterSettings {
  difficulty: Difficulty;
  speedMultiplier: number; // 0.5 to 2.5, default 1.0
  startingLives: number; // 1 to 10, default 3
  soundEnabled: boolean;
  showKeyboard: boolean;
  practiceMode: boolean;
  dailyChallenge: boolean;
}

export const DEFAULT_SHOOTER_SETTINGS: ShooterSettings = {
  difficulty: "medium",
  speedMultiplier: 1.0,
  startingLives: 3,
  soundEnabled: true,
  showKeyboard: true,
  practiceMode: false,
  dailyChallenge: false,
};

export const SETTINGS_KEY = "ttp:shooter:settings:v1";

export const ShooterSettingsSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  speedMultiplier: z.number().finite().optional(),
  startingLives: z.number().finite().optional(),
  soundEnabled: z.boolean().optional(),
  showKeyboard: z.boolean().optional(),
  practiceMode: z.boolean().optional(),
  dailyChallenge: z.boolean().optional(),
});

export function sanitizeShooterSettings(raw: unknown): ShooterSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SHOOTER_SETTINGS };
  const record = raw as Record<string, unknown>;
  const diffCheck = z.enum(["easy", "medium", "hard"]).safeParse(record["difficulty"]);
  const speed = record["speedMultiplier"];
  const lives = record["startingLives"];

  return {
    difficulty: diffCheck.success ? diffCheck.data : DEFAULT_SHOOTER_SETTINGS.difficulty,
    speedMultiplier:
      typeof speed === "number" && Number.isFinite(speed)
        ? Math.min(2.5, Math.max(0.5, speed))
        : DEFAULT_SHOOTER_SETTINGS.speedMultiplier,
    startingLives:
      typeof lives === "number" && Number.isFinite(lives)
        ? Math.min(10, Math.max(1, Math.round(lives)))
        : DEFAULT_SHOOTER_SETTINGS.startingLives,
    soundEnabled:
      typeof record["soundEnabled"] === "boolean"
        ? record["soundEnabled"]
        : DEFAULT_SHOOTER_SETTINGS.soundEnabled,
    showKeyboard:
      typeof record["showKeyboard"] === "boolean"
        ? record["showKeyboard"]
        : DEFAULT_SHOOTER_SETTINGS.showKeyboard,
    practiceMode:
      typeof record["practiceMode"] === "boolean"
        ? record["practiceMode"]
        : DEFAULT_SHOOTER_SETTINGS.practiceMode,
    dailyChallenge:
      typeof record["dailyChallenge"] === "boolean"
        ? record["dailyChallenge"]
        : DEFAULT_SHOOTER_SETTINGS.dailyChallenge,
  };
}

export function loadShooterSettings(): ShooterSettings {
  if (typeof window === "undefined") return DEFAULT_SHOOTER_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SHOOTER_SETTINGS;
    return sanitizeShooterSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SHOOTER_SETTINGS;
  }
}

export function saveShooterSettings(settings: ShooterSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore quota or private browsing errors
  }
}

export async function loadShooterSettingsFromStorage(storage: Storage): Promise<ShooterSettings> {
  try {
    const raw = await storage.get(SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_SHOOTER_SETTINGS };
    return sanitizeShooterSettings(raw);
  } catch {
    return { ...DEFAULT_SHOOTER_SETTINGS };
  }
}

export async function saveShooterSettingsToStorage(
  storage: Storage,
  settings: ShooterSettings,
): Promise<ShooterSettings> {
  const sanitized = sanitizeShooterSettings(settings);
  try {
    await storage.set(SETTINGS_KEY, sanitized);
  } catch {
    // Ignore storage errors
  }
  return sanitized;
}
