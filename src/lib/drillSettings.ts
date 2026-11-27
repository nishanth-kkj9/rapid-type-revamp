import { z } from "./zodSetup";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { WordListId } from "@/lib/sentenceGenerator";
import type { Storage } from "./storage";

export type CaretStyle = "smooth" | "block" | "bar" | "underline";
export type DrillSound = "off" | "click" | "beep";
export type DrillMode = "time" | "words" | "quote";
export type WordCountOption = number;
export type QuoteLengthOption = "short" | "medium" | "long";
export type StrictMode = "off" | "letter" | "word";
export type QuickRestartKey = "esc" | "tab" | "enter" | "off";
export type PaceCaretMode = "off" | "pb";

export const CUSTOM_DURATION_MIN = 5;
export const CUSTOM_DURATION_MAX = 600;
export const CUSTOM_DURATION_STEP = 5;
export const CUSTOM_WORD_MIN = 5;
export const CUSTOM_WORD_MAX = 500;

export interface DrillSettings {
  wordList: WordListId;
  duration: number; // 5..600 step 5 (presets: 15, 30, 60, 120)
  sound: DrillSound;
  caretStyle: CaretStyle;
  targetWpm: number; // e.g. 60
  showLiveWpm: boolean;
  showKeyboard: boolean;
  focusWeakKeys: boolean;
  drillMode?: DrillMode | undefined;
  wordCount?: WordCountOption | undefined;
  quoteLength?: QuoteLengthOption | undefined;
  quickRestart?: QuickRestartKey | undefined;
  strictMode?: StrictMode | undefined;
  paceCaret?: PaceCaretMode | undefined;
  includePunctuation?: boolean | undefined;
  includeNumbers?: boolean | undefined;
  includeCapitals?: boolean | undefined;
  customTextId?: string | null | undefined;
  keyboardLayout?: KeyboardLayoutId | undefined;
  keyboardStandard?: KeyboardStandard | undefined;
}

export const DEFAULT_DRILL_SETTINGS: DrillSettings = {
  wordList: "200",
  duration: 30,
  sound: "click",
  caretStyle: "smooth",
  targetWpm: 60,
  showLiveWpm: true,
  showKeyboard: true,
  focusWeakKeys: false,
  quickRestart: "tab",
};

export const DRILL_SETTINGS_KEY = "ttp:drill:settings:v1";

export const WORD_LIST_OPTIONS: { id: WordListId; label: string }[] = [
  { id: "200", label: "Common 200" },
  { id: "1000", label: "Common 1000" },
];
export const DRILL_DURATIONS = [15, 30, 60, 120] as const;
export const DRILL_WORD_COUNTS = [10, 25, 50, 100] as const;
export const DRILL_QUOTE_LENGTHS: QuoteLengthOption[] = ["short", "medium", "long"];
export const STRICT_MODES: { id: StrictMode; label: string; description: string }[] = [
  { id: "off", label: "Off", description: "Type freely through errors" },
  { id: "letter", label: "Letter", description: "Caret stays on wrong letters" },
  { id: "word", label: "Word", description: "Space blocked until word is fixed" },
];
export const QUICK_RESTART_LABELS: Record<QuickRestartKey, string> = {
  esc: "Esc",
  tab: "Tab",
  enter: "Enter",
  off: "Off",
};
export const QUICK_RESTART_OPTIONS: { id: QuickRestartKey; label: string }[] = [
  { id: "esc", label: "Esc" },
  { id: "tab", label: "Tab" },
  { id: "enter", label: "Enter" },
  { id: "off", label: "Off" },
];
export const PACE_CARET_OPTIONS: { id: PaceCaretMode; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "pb", label: "Personal Best" },
];

export function isValidDuration(val: unknown): val is number {
  return (
    typeof val === "number" &&
    Number.isInteger(val) &&
    val >= CUSTOM_DURATION_MIN &&
    val <= CUSTOM_DURATION_MAX &&
    val % CUSTOM_DURATION_STEP === 0
  );
}

export function clampCustomDuration(val: number): number {
  if (!Number.isFinite(val)) return DEFAULT_DRILL_SETTINGS.duration;
  const clamped = Math.min(CUSTOM_DURATION_MAX, Math.max(CUSTOM_DURATION_MIN, Math.round(val)));
  const stepped = Math.round(clamped / CUSTOM_DURATION_STEP) * CUSTOM_DURATION_STEP;
  return Math.min(CUSTOM_DURATION_MAX, Math.max(CUSTOM_DURATION_MIN, stepped));
}

export function isValidWordCount(val: unknown): val is number {
  return (
    typeof val === "number" &&
    Number.isInteger(val) &&
    val >= CUSTOM_WORD_MIN &&
    val <= CUSTOM_WORD_MAX
  );
}

export function clampCustomWordCount(val: number): number {
  if (!Number.isFinite(val)) return 25;
  return Math.min(CUSTOM_WORD_MAX, Math.max(CUSTOM_WORD_MIN, Math.round(val)));
}

export const DrillSettingsSchema = z.object({
  wordList: z.enum(["200", "1000"]).optional(),
  duration: z
    .number()
    .int()
    .min(CUSTOM_DURATION_MIN)
    .max(CUSTOM_DURATION_MAX)
    .refine((n) => n % CUSTOM_DURATION_STEP === 0)
    .optional(),
  sound: z.enum(["off", "click", "beep"]).optional(),
  caretStyle: z.enum(["smooth", "block", "bar", "underline"]).optional(),
  targetWpm: z.number().finite().optional(),
  showLiveWpm: z.boolean().optional(),
  showKeyboard: z.boolean().optional(),
  focusWeakKeys: z.boolean().optional(),
  drillMode: z.enum(["time", "words", "quote"]).optional(),
  wordCount: z.number().int().min(CUSTOM_WORD_MIN).max(CUSTOM_WORD_MAX).optional(),
  quoteLength: z.enum(["short", "medium", "long"]).optional(),
  quickRestart: z.enum(["esc", "tab", "enter", "off"]).optional(),
  strictMode: z.enum(["off", "letter", "word"]).optional(),
  paceCaret: z.enum(["off", "pb"]).optional(),
  includePunctuation: z.boolean().optional(),
  includeNumbers: z.boolean().optional(),
  includeCapitals: z.boolean().optional(),
  customTextId: z.string().nullable().optional(),
  keyboardLayout: z.enum(["qwerty", "dvorak", "colemak", "qwertz", "azerty"]).optional(),
  keyboardStandard: z.enum(["ansi", "iso"]).optional(),
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

export function getQuickRestart(settings: DrillSettings): QuickRestartKey {
  return settings.quickRestart ?? "esc";
}

export function getStrictMode(settings: DrillSettings): StrictMode {
  return settings.strictMode ?? "off";
}

export function getPaceCaret(settings: DrillSettings): PaceCaretMode {
  return settings.paceCaret ?? "off";
}

export function getKeyboardLayout(settings: DrillSettings): KeyboardLayoutId {
  return settings.keyboardLayout ?? "qwerty";
}

export function getKeyboardStandard(settings: DrillSettings): KeyboardStandard {
  return settings.keyboardStandard ?? "ansi";
}

export function resolveTextOptions(settings: DrillSettings): {
  punctuation: boolean;
  numbers: boolean;
  capitals: boolean;
} {
  return {
    punctuation: settings.includePunctuation ?? false,
    numbers: settings.includeNumbers ?? false,
    capitals: settings.includeCapitals ?? false,
  };
}

export function drillModeKey(settings: DrillSettings): string {
  const mode = getDrillMode(settings);
  if (mode === "words") return `${getWordCount(settings)}w`;
  if (mode === "quote") return "quote";
  return `${settings.duration}s`;
}

function legacyDifficultyToWordList(rawDiff: unknown): WordListId | null {
  if (rawDiff === "easy") return "200";
  if (rawDiff === "medium" || rawDiff === "hard") return "1000";
  return null;
}

export function sanitizeDrillSettings(raw: unknown): DrillSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_DRILL_SETTINGS };
  const record = raw as Record<string, unknown>;

  const listCheck = z.enum(["200", "1000"]).safeParse(record["wordList"]);
  const wordList: WordListId = listCheck.success
    ? listCheck.data
    : (legacyDifficultyToWordList(record["difficulty"]) ?? DEFAULT_DRILL_SETTINGS.wordList);

  const durVal = record["duration"];
  const soundCheck = z.enum(["off", "click", "beep"]).safeParse(record["sound"]);
  const caretCheck = z
    .enum(["smooth", "block", "bar", "underline"])
    .safeParse(record["caretStyle"]);
  const targetVal = record["targetWpm"];

  const result: DrillSettings = {
    wordList,
    duration: isValidDuration(durVal) ? durVal : DEFAULT_DRILL_SETTINGS.duration,
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
  if (dmCheck.success) result.drillMode = dmCheck.data;

  const wcVal = record["wordCount"];
  if (isValidWordCount(wcVal)) result.wordCount = wcVal;

  const qlCheck = z.enum(["short", "medium", "long"]).safeParse(record["quoteLength"]);
  if (qlCheck.success) result.quoteLength = qlCheck.data;

  const qrCheck = z.enum(["esc", "tab", "enter", "off"]).safeParse(record["quickRestart"]);
  if (qrCheck.success) {
    result.quickRestart = qrCheck.data;
  } else if (typeof record["tabToRestart"] === "boolean") {
    result.quickRestart = record["tabToRestart"] ? "tab" : "esc";
  }

  const strictCheck = z.enum(["off", "letter", "word"]).safeParse(record["strictMode"]);
  if (strictCheck.success) result.strictMode = strictCheck.data;

  const paceCheck = z.enum(["off", "pb"]).safeParse(record["paceCaret"]);
  if (paceCheck.success) result.paceCaret = paceCheck.data;

  if (typeof record["includePunctuation"] === "boolean")
    result.includePunctuation = record["includePunctuation"];
  if (typeof record["includeNumbers"] === "boolean")
    result.includeNumbers = record["includeNumbers"];
  if (typeof record["includeCapitals"] === "boolean")
    result.includeCapitals = record["includeCapitals"];
  if (typeof record["customTextId"] === "string" && record["customTextId"].length > 0) {
    result.customTextId = record["customTextId"];
  } else if (record["customTextId"] === null) {
    result.customTextId = null;
  }

  const layoutCheck = z
    .enum(["qwerty", "dvorak", "colemak", "qwertz", "azerty"])
    .safeParse(record["keyboardLayout"]);
  if (layoutCheck.success) result.keyboardLayout = layoutCheck.data;

  const stdCheck = z.enum(["ansi", "iso"]).safeParse(record["keyboardStandard"]);
  if (stdCheck.success) result.keyboardStandard = stdCheck.data;

  return result;
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
