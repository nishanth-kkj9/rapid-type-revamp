import {
  isValidDuration,
  isValidWordCount,
  type DrillMode,
  type DrillSettings,
  type QuoteLengthOption,
  type WordCountOption,
} from "./drillSettings";
import type { KeyboardLayoutId } from "./keyboardLayout";
import type { WordListId } from "./sentenceGenerator";

export type AppMode = "drill" | "learn" | "stats" | "settings";

export interface UrlStatePatch {
  mode?: AppMode;
  drillMode?: DrillMode;
  duration?: number;
  wordCount?: WordCountOption;
  quoteLength?: QuoteLengthOption;
  wordList?: WordListId;
  keyboardLayout?: KeyboardLayoutId;
}

const VALID_MODES = new Set<AppMode>(["drill", "learn", "stats", "settings"]);
const VALID_DRILL_MODES = new Set<DrillMode>(["time", "words", "quote"]);
const VALID_QUOTE_LENGTHS = new Set<QuoteLengthOption>(["short", "medium", "long"]);
const VALID_WORD_LISTS = new Set<WordListId>(["200", "1000"]);
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

  const list = params.get("list");
  if (list && VALID_WORD_LISTS.has(list as WordListId)) {
    patch.wordList = list as WordListId;
  } else {
    const legacyDiff = params.get("diff");
    if (legacyDiff === "easy") patch.wordList = "200";
    else if (legacyDiff === "medium" || legacyDiff === "hard") patch.wordList = "1000";
  }

  const layout = params.get("layout");
  if (layout && VALID_LAYOUTS.has(layout as KeyboardLayoutId)) {
    patch.keyboardLayout = layout as KeyboardLayoutId;
  }

  return patch;
}

export function buildUrlSearch(mode: AppMode, settings: DrillSettings): string {
  const params = new URLSearchParams();
  params.set("mode", mode);
  if (mode === "drill") {
    const dm = settings.drillMode ?? "time";
    params.set("test", dm);
    if (dm === "time") {
      params.set("duration", String(settings.duration));
      params.set("list", settings.wordList);
    } else if (dm === "words") {
      params.set("words", String(settings.wordCount ?? 25));
      params.set("list", settings.wordList);
    } else {
      params.set("quote", settings.quoteLength ?? "medium");
    }
    if (settings.keyboardLayout && settings.keyboardLayout !== "qwerty") {
      params.set("layout", settings.keyboardLayout);
    }
  }
  return `?${params.toString()}`;
}

export function syncUrlState(mode: AppMode, settings: DrillSettings): void {
  if (typeof window === "undefined") return;
  try {
    const nextSearch = buildUrlSearch(mode, settings);
    if (window.location.search === nextSearch) return;
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  } catch {
    // ignore history errors in sandboxed frames
  }
}
