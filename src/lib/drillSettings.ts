import type { Difficulty } from "@/lib/sentenceGenerator";

export type CaretStyle = "smooth" | "block" | "bar" | "underline";
export type DrillSound = "off" | "click" | "beep";

export interface DrillSettings {
  difficulty: Difficulty;
  duration: number; // 15, 30, 60, 120
  sound: DrillSound;
  caretStyle: CaretStyle;
  targetWpm: number; // e.g. 60
  showLiveWpm: boolean;
}

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  difficulty: "medium",
  duration: 30,
  sound: "click",
  caretStyle: "smooth",
  targetWpm: 60,
  showLiveWpm: true,
};

export const DRILL_SETTINGS_KEY = "ttp:drill:settings:v1";
const LEGACY_DIFF_KEY = "ttp:drill:diff:v1";

export function loadDrillSettings(): DrillSettings {
  if (typeof window === "undefined") return DEFAULT_DRILL_SETTINGS;
  try {
    const raw = localStorage.getItem(DRILL_SETTINGS_KEY);
    if (!raw) {
      // Check for legacy difficulty
      const legacyDiff = localStorage.getItem(LEGACY_DIFF_KEY) as Difficulty | null;
      if (legacyDiff && ["easy", "medium", "hard"].includes(legacyDiff)) {
        return { ...DEFAULT_DRILL_SETTINGS, difficulty: legacyDiff };
      }
      return DEFAULT_DRILL_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    const validDurations = [15, 30, 60, 120];
    const validCaret: CaretStyle[] = ["smooth", "block", "bar", "underline"];
    const validSound: DrillSound[] = ["off", "click", "beep"];

    return {
      difficulty:
        parsed.difficulty === "easy" ||
        parsed.difficulty === "medium" ||
        parsed.difficulty === "hard"
          ? parsed.difficulty
          : DEFAULT_DRILL_SETTINGS.difficulty,
      duration:
        typeof parsed.duration === "number" && validDurations.includes(parsed.duration)
          ? parsed.duration
          : DEFAULT_DRILL_SETTINGS.duration,
      sound:
        typeof parsed.sound === "string" && validSound.includes(parsed.sound as DrillSound)
          ? (parsed.sound as DrillSound)
          : DEFAULT_DRILL_SETTINGS.sound,
      caretStyle:
        typeof parsed.caretStyle === "string" &&
        validCaret.includes(parsed.caretStyle as CaretStyle)
          ? (parsed.caretStyle as CaretStyle)
          : DEFAULT_DRILL_SETTINGS.caretStyle,
      targetWpm:
        typeof parsed.targetWpm === "number" && !Number.isNaN(parsed.targetWpm)
          ? Math.min(200, Math.max(20, Math.round(parsed.targetWpm)))
          : DEFAULT_DRILL_SETTINGS.targetWpm,
      showLiveWpm:
        typeof parsed.showLiveWpm === "boolean"
          ? parsed.showLiveWpm
          : DEFAULT_DRILL_SETTINGS.showLiveWpm,
    };
  } catch {
    return DEFAULT_DRILL_SETTINGS;
  }
}

export function saveDrillSettings(settings: DrillSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRILL_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(LEGACY_DIFF_KEY, settings.difficulty);
  } catch {
    // Ignore storage errors
  }
}
