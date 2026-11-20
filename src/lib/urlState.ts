import {
  isValidDuration,
  isValidWordCount,
  type DrillMode,
  type DrillSettings,
  type QuoteLengthOption,
  type WordCountOption,
} from "./drillSettings";
import type { KeyboardLayoutId } from "./keyboardLayout";
import type { Difficulty } from "./sentenceGenerator";

export type AppMode = "drill" | "learn" | "shooter" | "stats" | "achievements" | "settings";

export type SettingsTabId =
  "typing" | "content" | "keyboard" | "sound" | "game" | "appearance" | "data";

export interface UrlStatePatch {
  mode?: AppMode;
  settingsTab?: SettingsTabId;
  drillMode?: DrillMode;
  duration?: number;
  wordCount?: WordCountOption;
  quoteLength?: QuoteLengthOption;
  difficulty?: Difficulty;
  keyboardLayout?: KeyboardLayoutId;
}

const VALID_MODES = new Set<AppMode>([
  "drill",
  "learn",
  "shooter",
  "stats",
  "achievements",
  "settings",
]);
const VALID_SETTINGS_TABS = new Set<SettingsTabId>([
  "typing",
  "content",
  "keyboard",
  "sound",
  "game",
  "appearance",
  "data",
]);
const VALID_DRILL_MODES = new Set<DrillMode>(["time", "words", "quote"]);
const VALID_QUOTE_LENGTHS = new Set<QuoteLengthOption>(["short", "medium", "long"]);
const VALID_DIFFICULTIES = new Set<Difficulty>(["easy", "medium", "hard"]);
const VALID_LAYOUTS = new Set<KeyboardLayoutId>([
  "qwerty",
  "dvorak",
  "colemak",
  "qwertz",
  "azerty",
]);

export function parseUrlState(search: string): UrlStatePatch {
  const params = new URLSearchParams(search);
  const patch: UrlStatePatch = {};

  const mode = params.get("mode");
  if (mode && VALID_MODES.has(mode as AppMode)) {
    patch.mode = mode as AppMode;
  }

  const tab = params.get("tab");
  if (tab && VALID_SETTINGS_TABS.has(tab as SettingsTabId)) {
    patch.settingsTab = tab as SettingsTabId;
  }

  const test = params.get("test");
  if (test && VALID_DRILL_MODES.has(test as DrillMode)) {
    patch.drillMode = test as DrillMode;
  }

  const rawDur = params.get("duration");
  if (rawDur !== null) {
    const dur = Number(rawDur);
    if (isValidDuration(dur)) {
      patch.duration = dur;
    }
  }

  const rawWords = params.get("words");
  if (rawWords !== null) {
    const words = Number(rawWords);
    if (isValidWordCount(words)) {
      patch.wordCount = words;
    }
  }

  const quote = params.get("quote");
  if (quote && VALID_QUOTE_LENGTHS.has(quote as QuoteLengthOption)) {
    patch.quoteLength = quote as QuoteLengthOption;
  }

  const diff = params.get("diff");
  if (diff && VALID_DIFFICULTIES.has(diff as Difficulty)) {
    patch.difficulty = diff as Difficulty;
  }

  const layout = params.get("layout");
  if (layout && VALID_LAYOUTS.has(layout as KeyboardLayoutId)) {
    patch.keyboardLayout = layout as KeyboardLayoutId;
  }

  return patch;
}

export function buildUrlSearch(
  mode: AppMode,
  settings: DrillSettings,
  settingsTab?: SettingsTabId,
): string {
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (mode === "settings" && settingsTab && settingsTab !== "typing") {
    params.set("tab", settingsTab);
  } else if (mode === "drill") {
    const dm = settings.drillMode ?? "time";
    params.set("test", dm);
    if (dm === "time") {
      params.set("duration", String(settings.duration));
      params.set("diff", settings.difficulty);
    } else if (dm === "words") {
      params.set("words", String(settings.wordCount ?? 25));
      params.set("diff", settings.difficulty);
    } else {
      params.set("quote", settings.quoteLength ?? "medium");
    }
    if (settings.keyboardLayout && settings.keyboardLayout !== "qwerty") {
      params.set("layout", settings.keyboardLayout);
    }
  }
  return `?${params.toString()}`;
}

export function syncUrlState(
  mode: AppMode,
  settings: DrillSettings,
  settingsTab?: SettingsTabId,
): void {
  if (typeof window === "undefined") return;
  try {
    const nextSearch = buildUrlSearch(mode, settings, settingsTab);
    if (window.location.search === nextSearch) return;
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  } catch {
    // ignore history errors in sandboxed frames
  }
}
