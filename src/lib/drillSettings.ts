import { z } from "zod";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { Difficulty, TextStyle } from "@/lib/sentenceGenerator";
import type { Storage } from "./storage";

export type CaretStyle = "smooth" | "block" | "bar" | "underline";
export type DrillSound = "off" | "click" | "beep";
export type DrillMode = "time" | "words" | "quote";
export type WordCountOption = 10 | 25 | 50 | 100;
export type QuoteLengthOption = "short" | "medium" | "long";

export interface DrillSettings {
  difficulty: Difficulty;
  duration: number; // 15, 30, 60, 120
  sound: DrillSound;
  caretStyle: CaretStyle;
  targetWpm: number; // e.g. 60
  showLiveWpm: boolean;
  showKeyboard: boolean;
  focusWeakKeys: boolean;
  drillMode?: DrillMode | undefined;
  wordCount?: WordCountOption | undefined;
  quoteLength?: QuoteLengthOption | undefined;
  tabToRestart?: boolean | undefined;
  textStyle?: TextStyle | undefined;
  includePunctuation?: boolean | undefined;
  includeNumbers?: boolean | undefined;
  includeCapitals?: boolean | undefined;
  customTextId?: string | null | undefined;
  keyboardLayout?: KeyboardLayoutId | undefined;
  keyboardStandard?: KeyboardStandard | undefined;
  showFingerZones?: boolean | undefined;
}

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  difficulty: "medium",
  duration: 30,
  sound: "click",
  caretStyle: "smooth",
  targetWpm: 60,
  showLiveWpm: true,
  showKeyboard: true,
  focusWeakKeys: false,
};

export const DRILL_SETTINGS_KEY = "ttp:drill:settings:v1";
const LEGACY_DIFF_KEY = "ttp:drill:diff:v1";

export const DRILL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const DRILL_DURATIONS = [15, 30, 60, 120] as const;
export const DRILL_WORD_COUNTS: WordCountOption[] = [10, 25, 50, 100];
export const DRILL_QUOTE_LENGTHS: QuoteLengthOption[] = ["short", "medium", "long"];

const VALID_DURATIONS = new Set<number>(DRILL_DURATIONS);
const VALID_WORD_COUNTS = new Set<number>(DRILL_WORD_COUNTS);

export const DrillSettingsSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  duration: z.number().optional(),
  sound: z.enum(["off", "click", "beep"]).optional(),
  caretStyle: z.enum(["smooth", "block", "bar", "underline"]).optional(),
  targetWpm: z.number().finite().optional(),
  showLiveWpm: z.boolean().optional(),
  showKeyboard: z.boolean().optional(),
  focusWeakKeys: z.boolean().optional(),
  drillMode: z.enum(["time", "words", "quote"]).optional(),
  wordCount: z.number().optional(),
  quoteLength: z.enum(["short", "medium", "long"]).optional(),
  tabToRestart: z.boolean().optional(),
  textStyle: z.enum(["words", "sentences"]).optional(),
  includePunctuation: z.boolean().optional(),
  includeNumbers: z.boolean().optional(),
  includeCapitals: z.boolean().optional(),
  customTextId: z.string().nullable().optional(),
  keyboardLayout: z.enum(["qwerty", "dvorak", "colemak", "qwertz", "azerty"]).optional(),
  keyboardStandard: z.enum(["ansi", "iso"]).optional(),
  showFingerZones: z.boolean().optional(),
});

export function getDrillMode(settings: DrillSettings): DrillMode {
  return settings.drillMode ?? "time";
}

export function getWordCount(settings: DrillSettings): WordCountOption {
  return settings.wordCount ?? 25;
}

export function getQuoteLength(settings: DrillSettings): QuoteLengthOption {
  return settings.quoteLength ?? "medium";
}

export function getTabToRestart(settings: DrillSettings): boolean {
  return settings.tabToRestart ?? false;
}

export function getKeyboardLayout(settings: DrillSettings): KeyboardLayoutId {
  return settings.keyboardLayout ?? "qwerty";
}

export function getKeyboardStandard(settings: DrillSettings): KeyboardStandard {
  return settings.keyboardStandard ?? "ansi";
}

export function getShowFingerZones(settings: DrillSettings): boolean {
  return settings.showFingerZones ?? true;
}

export function resolveTextOptions(settings: DrillSettings): {
  style: TextStyle;
  punctuation: boolean;
  numbers: boolean;
  capitals: boolean;
} {
  const mode = getDrillMode(settings);
  const style: TextStyle = settings.textStyle ?? (mode === "words" ? "words" : "sentences");
  const isWordsStyle = style === "words";
  return {
    style,
    punctuation: settings.includePunctuation ?? !isWordsStyle,
    numbers: settings.includeNumbers ?? false,
    capitals: settings.includeCapitals ?? !isWordsStyle,
  };
}

export function drillModeKey(settings: DrillSettings): string {
  const mode = getDrillMode(settings);
  if (mode === "words") return `${getWordCount(settings)}w`;
  if (mode === "quote") return "quote";
  return `${settings.duration}s`;
}

export function sanitizeDrillSettings(raw: unknown): DrillSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DRILL_SETTINGS };
  const record = raw as Record<string, unknown>;

  const diffCheck = z.enum(["easy", "medium", "hard"]).safeParse(record["difficulty"]);
  const durVal = record["duration"];
  const soundCheck = z.enum(["off", "click", "beep"]).safeParse(record["sound"]);
  const caretCheck = z
    .enum(["smooth", "block", "bar", "underline"])
    .safeParse(record["caretStyle"]);
  const targetVal = record["targetWpm"];

  const result: DrillSettings = {
    difficulty: diffCheck.success ? diffCheck.data : DEFAULT_DRILL_SETTINGS.difficulty,
    duration:
      typeof durVal === "number" && VALID_DURATIONS.has(durVal)
        ? durVal
        : DEFAULT_DRILL_SETTINGS.duration,
    sound: soundCheck.success ? soundCheck.data : DEFAULT_DRILL_SETTINGS.sound,
    caretStyle: caretCheck.success ? caretCheck.data : DEFAULT_DRILL_SETTINGS.caretStyle,
    targetWpm:
      typeof targetVal === "number" && Number.isFinite(targetVal)
        ? Math.min(160, Math.max(20, Math.round(targetVal)))
        : DEFAULT_DRILL_SETTINGS.targetWpm,
    showLiveWpm:
      typeof record["showLiveWpm"] === "boolean"
        ? record["showLiveWpm"]
        : DEFAULT_DRILL_SETTINGS.showLiveWpm,
    showKeyboard:
      typeof record["showKeyboard"] === "boolean"
        ? record["showKeyboard"]
        : DEFAULT_DRILL_SETTINGS.showKeyboard,
    focusWeakKeys:
      typeof record["focusWeakKeys"] === "boolean"
        ? record["focusWeakKeys"]
        : DEFAULT_DRILL_SETTINGS.focusWeakKeys,
  };

  const dmCheck = z.enum(["time", "words", "quote"]).safeParse(record["drillMode"]);
  if (dmCheck.success) {
    result.drillMode = dmCheck.data;
  }

  const wcVal = record["wordCount"];
  if (typeof wcVal === "number" && VALID_WORD_COUNTS.has(wcVal)) {
    result.wordCount = wcVal as WordCountOption;
  }

  const qlCheck = z.enum(["short", "medium", "long"]).safeParse(record["quoteLength"]);
  if (qlCheck.success) {
    result.quoteLength = qlCheck.data;
  }

  if (typeof record["tabToRestart"] === "boolean") {
    result.tabToRestart = record["tabToRestart"];
  }

  const tsCheck = z.enum(["words", "sentences"]).safeParse(record["textStyle"]);
  if (tsCheck.success) {
    result.textStyle = tsCheck.data;
  }

  if (typeof record["includePunctuation"] === "boolean") {
    result.includePunctuation = record["includePunctuation"];
  }
  if (typeof record["includeNumbers"] === "boolean") {
    result.includeNumbers = record["includeNumbers"];
  }
  if (typeof record["includeCapitals"] === "boolean") {
    result.includeCapitals = record["includeCapitals"];
  }
  if (typeof record["customTextId"] === "string" && record["customTextId"].length > 0) {
    result.customTextId = record["customTextId"];
  } else if (record["customTextId"] === null) {
    result.customTextId = null;
  }

  const layoutCheck = z
    .enum(["qwerty", "dvorak", "colemak", "qwertz", "azerty"])
    .safeParse(record["keyboardLayout"]);
  if (layoutCheck.success) {
    result.keyboardLayout = layoutCheck.data;
  }

  const stdCheck = z.enum(["ansi", "iso"]).safeParse(record["keyboardStandard"]);
  if (stdCheck.success) {
    result.keyboardStandard = stdCheck.data;
  }

  if (typeof record["showFingerZones"] === "boolean") {
    result.showFingerZones = record["showFingerZones"];
  }

  return result;
}

export function loadDrillSettings(): DrillSettings {
  if (typeof window === "undefined") return DEFAULT_DRILL_SETTINGS;
  try {
    const raw = localStorage.getItem(DRILL_SETTINGS_KEY);
    if (!raw) {
      const legacyDiff = localStorage.getItem(LEGACY_DIFF_KEY) as Difficulty | null;
      if (legacyDiff && ["easy", "medium", "hard"].includes(legacyDiff)) {
        return { ...DEFAULT_DRILL_SETTINGS, difficulty: legacyDiff };
      }
      return DEFAULT_DRILL_SETTINGS;
    }
    return sanitizeDrillSettings(JSON.parse(raw));
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

export async function loadDrillSettingsFromStorage(storage: Storage): Promise<DrillSettings> {
  try {
    const raw = await storage.get(DRILL_SETTINGS_KEY);
    if (raw === null) return { ...DEFAULT_DRILL_SETTINGS };
    return sanitizeDrillSettings(raw);
  } catch {
    return { ...DEFAULT_DRILL_SETTINGS };
  }
}

export async function saveDrillSettingsToStorage(
  storage: Storage,
  settings: DrillSettings,
): Promise<DrillSettings> {
  const sanitized = sanitizeDrillSettings(settings);
  try {
    await storage.set(DRILL_SETTINGS_KEY, sanitized);
  } catch {
    // Ignore storage errors
  }
  return sanitized;
}
