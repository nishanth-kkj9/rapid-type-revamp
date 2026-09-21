import type { Difficulty } from "@/lib/sentenceGenerator";

export interface ShooterSettings {
  difficulty: Difficulty;
  speedMultiplier: number; // 0.5 to 2.5, default 1.0
  startingLives: number; // 1 to 10, default 3
  soundEnabled: boolean;
}

export const DEFAULT_SHOOTER_SETTINGS: ShooterSettings = {
  difficulty: "medium",
  speedMultiplier: 1.0,
  startingLives: 3,
  soundEnabled: true,
};

const SETTINGS_KEY = "ttp:shooter:settings:v1";

export function loadShooterSettings(): ShooterSettings {
  if (typeof window === "undefined") return DEFAULT_SHOOTER_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SHOOTER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      difficulty:
        parsed.difficulty === "easy" ||
        parsed.difficulty === "medium" ||
        parsed.difficulty === "hard"
          ? parsed.difficulty
          : DEFAULT_SHOOTER_SETTINGS.difficulty,
      speedMultiplier:
        typeof parsed.speedMultiplier === "number" && !Number.isNaN(parsed.speedMultiplier)
          ? Math.min(2.5, Math.max(0.5, parsed.speedMultiplier))
          : DEFAULT_SHOOTER_SETTINGS.speedMultiplier,
      startingLives:
        typeof parsed.startingLives === "number" && !Number.isNaN(parsed.startingLives)
          ? Math.min(10, Math.max(1, Math.round(parsed.startingLives)))
          : DEFAULT_SHOOTER_SETTINGS.startingLives,
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_SHOOTER_SETTINGS.soundEnabled,
    };
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
