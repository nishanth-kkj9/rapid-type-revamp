import { z } from "zod";
import type { Storage } from "./storage";

export interface RunStats {
  wpm: number;
  rawWpm: number;
  /** Net WPM, penalized for uncorrected errors. */
  adjustedWpm: number;
  accuracy: number;
  correct: number;
  /** Total incorrect keystrokes (or errors in legacy runs). */
  incorrect: number;
  /** Errors still present in the final typed text at the end of the run. */
  uncorrectedErrors?: number | undefined;
  typed: number;
  elapsed: number;
  consistency: number;
}

export interface ComputeStatsOptions {
  keystrokesCorrect?: number;
  keystrokesIncorrect?: number;
  uncorrectedErrors?: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Cumulative per-second counts -> per-second deltas. */
export function toDeltas(cumulative: number[]): number[] {
  return cumulative.map((v, i, a) => (i === 0 ? v : v - (a[i - 1] ?? 0)));
}

/** Ensure cumulative progress samples are non-negative and monotonically non-decreasing. */
export function clampMonotonicSamples(samples: readonly number[]): number[] {
  const out: number[] = [];
  let max = 0;
  for (const val of samples) {
    const clean = Number.isFinite(val) ? Math.max(0, val) : max;
    if (clean > max) max = clean;
    out.push(max);
  }
  return out;
}

/**
 * Compute per-point WPM from monotonic cumulative progress samples using a rolling
 * 5-second window (or shorter for the first 4 seconds). If `elapsedSec` exceeds
 * `samples.length - 1`, the final point uses `elapsedSec` as its timestamp so partial
 * final seconds are weighted accurately without artificial dips or spikes.
 */
export function computeRollingWpmSeries(samples: readonly number[], elapsedSec?: number): number[] {
  const mono = clampMonotonicSamples(samples);
  if (mono.length === 0) return [];

  const timestamps = mono.map((_, i) => {
    if (i < mono.length - 1) return i + 1;
    if (
      typeof elapsedSec === "number" &&
      Number.isFinite(elapsedSec) &&
      elapsedSec > mono.length - 1
    ) {
      return elapsedSec;
    }
    return i + 1;
  });

  return mono.map((chars, i) => {
    const startIdx = Math.max(-1, i - 5);
    const prevChars = startIdx >= 0 ? (mono[startIdx] ?? 0) : 0;
    const tEnd = timestamps[i] ?? i + 1;
    const tStart = startIdx >= 0 ? (timestamps[startIdx] ?? startIdx + 1) : 0;
    const windowSec = Math.max(0.1, tEnd - tStart);
    const deltaChars = Math.max(0, chars - prevChars);
    return Math.max(0, Math.round((deltaChars / 5) * (60 / windowSec)));
  });
}

export interface ReconcileResult {
  correct: number;
  incorrect: number;
  mistakes: Record<string, number>;
}

/** Recompute counters and problem keys from the whole typed string against target passage. */
export function reconcile(text: string, value: string): ReconcileResult {
  let correct = 0;
  let incorrect = 0;
  const mistakes: Record<string, number> = {};
  for (let i = 0; i < value.length; i++) {
    const expected = text[i];
    if (expected === undefined) {
      incorrect++;
      continue;
    }
    if (value[i] === expected) correct++;
    else {
      incorrect++;
      mistakes[expected] = (mistakes[expected] ?? 0) + 1;
    }
  }
  return { correct, incorrect, mistakes };
}

export function computeStats(
  correct: number,
  incorrect: number,
  elapsedMs: number,
  samples: readonly number[] = [],
  options?: ComputeStatsOptions,
): RunStats {
  // Clamp to >= 1s so the first keystroke doesn't divide by ~1ms and spike WPM.
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const keyCorrect = options?.keystrokesCorrect ?? correct;
  const keyIncorrect = options?.keystrokesIncorrect ?? incorrect;
  const totalKeystrokes = keyCorrect + keyIncorrect;
  const uncorrected = options?.uncorrectedErrors ?? incorrect;

  const wpm = Math.max(0, correct / 5 / minutes);
  const rawWpm = totalKeystrokes / 5 / minutes;
  const adjustedWpm = Math.max(0, (correct - uncorrected) / 5 / minutes);
  const accuracy = totalKeystrokes === 0 ? 100 : (keyCorrect / totalKeystrokes) * 100;

  const wpmSeries = computeRollingWpmSeries(samples, elapsedMs / 1000);
  let consistency = 100;
  if (wpmSeries.length > 1) {
    const mean = wpmSeries.reduce((a, b) => a + b, 0) / wpmSeries.length;
    const variance = wpmSeries.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmSeries.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    consistency = Math.max(0, Math.min(100, 100 - cv * 100));
  }

  return {
    wpm: round(wpm),
    rawWpm: round(rawWpm),
    adjustedWpm: round(adjustedWpm),
    accuracy: round(accuracy),
    correct,
    incorrect: keyIncorrect,
    uncorrectedErrors: uncorrected,
    typed: totalKeystrokes,
    elapsed: elapsedMs / 1000,
    consistency: round(consistency),
  };
}

export interface RunSlowWord {
  word: string;
  wpm: number;
  avgMs: number;
}

export interface HistoryEntry extends RunStats {
  id: string;
  date: number;
  difficulty: string;
  mode: string;
  samples?: number[] | undefined;
  errorSeconds?: number[] | undefined;
  mistakes?: Record<string, number> | undefined;
  missedWords?: string[] | undefined;
  slowWords?: RunSlowWord[] | undefined;
  wordMistakes?: Record<string, number> | undefined;
  strict?: "letter" | "word" | undefined;
  repeated?: boolean | undefined;
  punctuation?: boolean | undefined;
  numbers?: boolean | undefined;
  quoteLength?: "short" | "medium" | "long" | undefined;
}

/** Normalize time modes e.g. "30" -> "30s" */
export function normalizeModeKey(modeKey: string): string {
  const trimmed = modeKey.trim().toLowerCase();
  if (!trimmed) return "30s";
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed}s`;
  }
  return trimmed;
}

/** Legacy removed modes whose saved IndexedDB entries stay preserved on disk but hidden from UI and stats. */
const LEGACY_HIDDEN_MODES = new Set(["shooter"]);

export function isVisibleHistoryEntry(entry: { mode: string }): boolean {
  return !LEGACY_HIDDEN_MODES.has(normalizeModeKey(entry.mode));
}

export function filterVisibleHistory(history: readonly HistoryEntry[]): HistoryEntry[] {
  return history.filter(isVisibleHistoryEntry);
}

/** Human-readable label for a mode key ("30" / "30s" -> "30s", "25w" -> "25 words", "quote" -> "Quote"). */
export function formatModeLabel(mode: string): string {
  const normalized = normalizeModeKey(mode);
  if (normalized === "quote") return "Quote";
  if (
    normalized === "learn" ||
    normalized.startsWith("learn-") ||
    normalized.startsWith("learn:")
  ) {
    return "Learn";
  }
  const wordsMatch = /^(\d+)w$/.exec(normalized);
  if (wordsMatch) {
    return `${wordsMatch[1]} words`;
  }
  const timeMatch = /^(\d+)s$/.exec(normalized);
  if (timeMatch) {
    return `${timeMatch[1]}s`;
  }
  return mode || "30s";
}

/** Human-readable label for a word list ("200" / "1000") or legacy difficulty string. */
export function formatWordListLabel(value: string): string {
  const norm = value.trim().toLowerCase();
  if (norm === "200") return "Common 200";
  if (norm === "1000") return "Common 1000";
  if (norm === "any") return "Any";
  if (norm === "learn") return "Learn";
  if (norm === "easy" || norm === "medium" || norm === "hard") {
    return `${norm[0]!.toUpperCase()}${norm.slice(1)}`;
  }
  return value;
}

/** Filter history entries belonging to the same test type (mode + length, and difficulty where relevant). */
export function getModeHistory(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): HistoryEntry[] {
  const normalized = normalizeModeKey(modeKey);
  const compareDifficulty = difficulty !== undefined && normalized !== "quote";
  return history.filter((h) => {
    if (!isVisibleHistoryEntry(h)) return false;
    if (normalizeModeKey(h.mode) !== normalized) return false;
    if (compareDifficulty && h.difficulty.toLowerCase() !== difficulty.toLowerCase()) return false;
    return true;
  });
}

function isExcludedFromPb(h: HistoryEntry): boolean {
  const mode = normalizeModeKey(h.mode);
  return (
    !isVisibleHistoryEntry(h) ||
    Boolean(h.repeated) ||
    mode === "learn" ||
    mode.startsWith("learn-") ||
    mode.startsWith("learn:")
  );
}

/** Personal best WPM for a specific test type (mode + length, and difficulty where relevant). Excludes learn and repeated runs. */
export function getPersonalBestWpm(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): number {
  return getModeHistory(history, modeKey, difficulty).reduce(
    (m, h) => (isExcludedFromPb(h) ? m : Math.max(m, h.wpm)),
    0,
  );
}

export interface HistoryProgressPoint extends Record<string, unknown> {
  id: string;
  index: number;
  label: string;
  date: number;
  wpm: number;
  accuracy: number;
  movingAvgWpm: number;
  mode: string;
  difficulty: string;
}

/**
 * Build chronological (oldest -> newest) progress chart series with a 7-run moving average.
 * Callers should pass already-filtered runs (or same-type runs) so trend lines stay meaningful.
 */
export function computeHistoryProgressSeries(
  entries: readonly HistoryEntry[],
  movingWindow = 7,
): HistoryProgressPoint[] {
  if (entries.length === 0) return [];
  const chronological = [...entries].sort((a, b) => a.date - b.date);
  const windowSize = Math.max(2, Math.floor(movingWindow));
  const out: HistoryProgressPoint[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const h = chronological[i]!;
    const start = Math.max(0, i - windowSize + 1);
    let sum = 0;
    for (let j = start; j <= i; j++) {
      sum += chronological[j]!.wpm;
    }
    const movingAvgWpm = Math.round((sum / (i - start + 1)) * 10) / 10;
    out.push({
      id: h.id,
      index: i + 1,
      label: `#${i + 1}`,
      date: h.date,
      wpm: round(h.wpm),
      accuracy: round(h.accuracy),
      movingAvgWpm,
      mode: normalizeModeKey(h.mode || "30s"),
      difficulty: h.difficulty,
    });
  }

  return out;
}

export interface PersonalBestRow {
  key: string;
  modeKey: string;
  modeLabel: string;
  difficulty: string;
  bestWpm: number;
  bestAccuracy: number;
  runs: number;
  lastDate: number;
  punctuation?: boolean | undefined;
  numbers?: boolean | undefined;
  quoteLength?: "short" | "medium" | "long" | undefined;
}

/**
 * Aggregate personal bests per test type (never mixing time lengths, word counts, quotes, or difficulties).
 * Excludes repeated, learn, and hidden legacy runs.
 */
export function computePersonalBestsTable(history: readonly HistoryEntry[]): PersonalBestRow[] {
  const drillEntries = history.filter((h) => !isExcludedFromPb(h));
  const groups = new Map<string, PersonalBestRow>();
  const bestRawWpm = new Map<string, number>();

  for (const h of drillEntries) {
    const modeKey = normalizeModeKey(h.mode || "30s");
    const difficulty = modeKey === "quote" ? "any" : h.difficulty.toLowerCase();
    const key = `${modeKey}:${difficulty}`;
    const existing = groups.get(key);
    if (!existing) {
      bestRawWpm.set(key, h.wpm);
      groups.set(key, {
        key,
        modeKey,
        modeLabel: formatModeLabel(modeKey),
        difficulty,
        bestWpm: round(h.wpm),
        bestAccuracy: round(h.accuracy),
        runs: 1,
        lastDate: h.date,
        ...(h.punctuation !== undefined ? { punctuation: h.punctuation } : {}),
        ...(h.numbers !== undefined ? { numbers: h.numbers } : {}),
        ...(h.quoteLength !== undefined ? { quoteLength: h.quoteLength } : {}),
      });
    } else {
      const prevRaw = bestRawWpm.get(key) ?? -1;
      if (h.wpm > prevRaw || (h.wpm === prevRaw && h.date > existing.lastDate)) {
        bestRawWpm.set(key, h.wpm);
        existing.punctuation = h.punctuation;
        existing.numbers = h.numbers;
        existing.quoteLength = h.quoteLength;
      }
      existing.bestWpm = Math.max(existing.bestWpm, round(h.wpm));
      existing.bestAccuracy = Math.max(existing.bestAccuracy, round(h.accuracy));
      existing.runs += 1;
      existing.lastDate = Math.max(existing.lastDate, h.date);
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.bestWpm - a.bestWpm || b.runs - a.runs || a.key.localeCompare(b.key),
  );
}

export interface SameTypeTrend {
  modeKey: string;
  difficulty: string;
  deltaPercent: number;
  recentAvgWpm: number;
  earlierAvgWpm: number;
  runCount: number;
}

/**
 * Compute WPM trend percentage comparing like with like ONLY.
 * Never mixes test types or difficulties: requires a concrete modeKey (never "all")
 * and (for non-quote modes) either an explicit difficulty or uniform difficulty across runs.
 */
export function computeSameTypeTrend(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): SameTypeTrend | null {
  const normalized = normalizeModeKey(modeKey);
  if (!normalized || normalized === "all") return null;

  const isDifficultyInvariant = normalized === "quote";
  const normalizedDiff = difficulty?.trim().toLowerCase();
  if (!isDifficultyInvariant && (!normalizedDiff || normalizedDiff === "all")) {
    const modeRuns = getModeHistory(history, normalized);
    const diffs = new Set(modeRuns.map((r) => r.difficulty.toLowerCase()));
    if (diffs.size !== 1) return null;
    const onlyDiff = Array.from(diffs)[0]!;
    return computeSameTypeTrend(history, normalized, onlyDiff);
  }

  const scoped = getModeHistory(
    history,
    normalized,
    isDifficultyInvariant ? undefined : normalizedDiff,
  ).sort((a, b) => a.date - b.date);

  if (scoped.length < 6) return null;

  const window = scoped.length >= 10 ? 5 : Math.floor(scoped.length / 2);
  const earlier = scoped.slice(0, window);
  const recent = scoped.slice(-window);

  const earlierAvgWpm = earlier.reduce((s, r) => s + r.wpm, 0) / earlier.length;
  const recentAvgWpm = recent.reduce((s, r) => s + r.wpm, 0) / recent.length;
  const deltaPercent =
    earlierAvgWpm > 0
      ? Math.round(((recentAvgWpm - earlierAvgWpm) / earlierAvgWpm) * 1000) / 10
      : 0;

  return {
    modeKey: normalized,
    difficulty: isDifficultyInvariant ? "any" : normalizedDiff!,
    deltaPercent,
    recentAvgWpm: round(recentAvgWpm),
    earlierAvgWpm: round(earlierAvgWpm),
    runCount: scoped.length,
  };
}

/** Uniform storage key for personal best velocity samples */
export function bestSamplesKey(modeKey: string, difficulty?: string): string {
  const normalized = normalizeModeKey(modeKey);
  if (difficulty && normalized !== "quote") {
    return `ttp:best:samples:v1:${normalized}:${difficulty.toLowerCase()}`;
  }
  return `ttp:best:samples:v1:${normalized}`;
}

export const HISTORY_STORAGE_KEY = "ttp:history:v1";
export const HISTORY_INDEX_KEY = "ttp:history:index:v1";
export const RUN_KEY_PREFIX = "ttp:run:";
export const MAX_IMPORT_RUNS = 20000;

export function runStorageKey(id: string): string {
  return `${RUN_KEY_PREFIX}${id}`;
}

export interface HistoryIndexEntry {
  id: string;
  date: number;
}

const HistoryIndexItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  date: z.number().finite().min(0),
});

export const RunSlowWordSchema = z.object({
  word: z.string().min(1).max(128),
  wpm: z.number().finite().min(0).max(5000),
  avgMs: z.number().finite().min(0).max(600000),
});

export const HistoryEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  date: z.number().finite().min(0),
  difficulty: z.string(),
  /** Legacy entries have no mode; they were standard 30s drills. */
  mode: z.string().default("30"),
  wpm: z.number().finite().min(0).max(5000),
  rawWpm: z.number().finite().min(0).max(5000).default(0),
  adjustedWpm: z.number().finite().min(0).max(5000).default(0),
  accuracy: z.number().finite().min(0).max(100),
  correct: z.number().int().min(0).max(100000).default(0),
  incorrect: z.number().int().min(0).max(100000).default(0),
  uncorrectedErrors: z.number().int().min(0).max(100000).optional(),
  typed: z.number().int().min(0).max(200000).default(0),
  elapsed: z.number().finite().min(0).max(86400).default(0),
  consistency: z.number().finite().min(0).max(100).default(100),
  samples: z.array(z.number().finite().min(0)).max(3600).optional(),
  errorSeconds: z.array(z.number().finite().min(0).max(86400)).max(500).optional(),
  mistakes: z.record(z.string().min(1).max(4), z.number().int().min(1).max(100000)).optional(),
  missedWords: z.array(z.string().min(1).max(128)).max(100).optional(),
  slowWords: z.array(RunSlowWordSchema).max(20).optional(),
  wordMistakes: z.record(z.string().min(1).max(128), z.number().int().min(1).max(1000)).optional(),
  strict: z.enum(["letter", "word"]).optional(),
  repeated: z.boolean().optional(),
  punctuation: z.boolean().optional(),
  numbers: z.boolean().optional(),
  quoteLength: z.enum(["short", "medium", "long"]).optional(),
});

export const SamplesSchema = z.array(z.number().finite().min(0)).max(3600);

export function parseHistoryEntries(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid: HistoryEntry[] = [];
  for (const item of raw) {
    const parsed = HistoryEntrySchema.safeParse(item);
    if (parsed.success) {
      valid.push(parsed.data as HistoryEntry);
    }
  }
  return valid;
}

export type ImportFailureReason = "invalid" | "too-many-runs" | "quota";

export type ImportResult =
  { ok: true; list: HistoryEntry[] } | { ok: false; reason: ImportFailureReason };

export function parseImportHistoryResult(
  json: string,
): { ok: true; entries: HistoryEntry[] } | { ok: false; reason: "invalid" | "too-many-runs" } {
  try {
    const raw: unknown = JSON.parse(json);
    let itemsToParse = raw;
    if (
      raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      "entries" in raw &&
      Array.isArray((raw as { entries: unknown }).entries)
    ) {
      itemsToParse = (raw as { entries: unknown }).entries;
    }
    if (!Array.isArray(itemsToParse)) {
      return { ok: false, reason: "invalid" };
    }
    if (itemsToParse.length > MAX_IMPORT_RUNS) {
      return { ok: false, reason: "too-many-runs" };
    }
    const parsed = z.array(HistoryEntrySchema).safeParse(itemsToParse);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    return { ok: true, entries: parsed.data as HistoryEntry[] };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

export function parseImportHistoryJson(json: string): HistoryEntry[] | null {
  const res = parseImportHistoryResult(json);
  return res.ok ? res.entries : null;
}

const historyCache = new WeakMap<Storage, HistoryEntry[]>();

export function invalidateHistoryCache(storage: Storage): void {
  historyCache.delete(storage);
}

async function storageSetMany(
  storage: Storage,
  entries: readonly (readonly [string, unknown])[],
): Promise<void> {
  if (entries.length === 0) return;
  if (storage.setMany) {
    await storage.setMany(entries);
    return;
  }
  await Promise.all(entries.map(([k, v]) => storage.set(k, v)));
}

async function storageDeleteMany(storage: Storage, keys: readonly string[]): Promise<void> {
  if (keys.length === 0) return;
  if (storage.deleteMany) {
    await storage.deleteMany(keys);
    return;
  }
  await Promise.all(keys.map((k) => storage.delete(k)));
}

async function storageGetAllRunsRaw(storage: Storage): Promise<[string, unknown][]> {
  if (storage.getAllByPrefix) {
    return storage.getAllByPrefix<unknown>(RUN_KEY_PREFIX);
  }
  const keys = await storage.list(RUN_KEY_PREFIX);
  if (keys.length === 0) return [];
  if (storage.getMany) {
    const vals = await storage.getMany<unknown>(keys);
    return keys.map((k, i) => [k, vals[i]] as [string, unknown]);
  }
  const pairs = await Promise.all(
    keys.map(async (k) => [k, await storage.get<unknown>(k)] as [string, unknown]),
  );
  return pairs;
}

function buildCompactIndex(entries: readonly HistoryEntry[]): HistoryIndexEntry[] {
  return entries.map((e) => ({ id: e.id, date: e.date }));
}

function deduplicateAndSortDesc(entries: readonly HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of entries) {
    byId.set(e.id, e);
  }
  return Array.from(byId.values()).sort((a, b) => b.date - a.date);
}

/** Fast structural check for already-sanitized runs stored under ttp:run:<id>, falling back to Zod on edge shapes. */
function coerceStoredRun(raw: unknown): HistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (
    typeof r["id"] === "string" &&
    r["id"].length > 0 &&
    typeof r["date"] === "number" &&
    Number.isFinite(r["date"]) &&
    typeof r["wpm"] === "number" &&
    Number.isFinite(r["wpm"]) &&
    typeof r["accuracy"] === "number" &&
    Number.isFinite(r["accuracy"]) &&
    typeof r["difficulty"] === "string" &&
    typeof r["mode"] === "string"
  ) {
    return raw as HistoryEntry;
  }
  const parsed = HistoryEntrySchema.safeParse(raw);
  return parsed.success ? (parsed.data as HistoryEntry) : null;
}

/**
 * Load all runs from per-run `ttp:run:<id>` keys (using `ttp:history:index:v1` as compact index).
 * Automatically migrates legacy monolithic `ttp:history:v1` payloads when present.
 */
export async function loadHistoryFromStorage(storage: Storage): Promise<HistoryEntry[]> {
  try {
    const [rawIndex, rawLegacy] = await Promise.all([
      storage.get(HISTORY_INDEX_KEY),
      storage.get(HISTORY_STORAGE_KEY),
    ]);

    // Automatic one-time migration from legacy ttp:history:v1 array
    if (rawLegacy !== null) {
      const legacyEntries = deduplicateAndSortDesc(parseHistoryEntries(rawLegacy));
      if (rawIndex === null) {
        if (legacyEntries.length > 0) {
          const pairs: [string, unknown][] = [
            [HISTORY_INDEX_KEY, buildCompactIndex(legacyEntries)],
            ...legacyEntries.map((e) => [runStorageKey(e.id), e] as [string, unknown]),
          ];
          await storageSetMany(storage, pairs);
        }
        await storage.delete(HISTORY_STORAGE_KEY);
        historyCache.set(storage, legacyEntries);
        return legacyEntries;
      }
      // Index already present alongside stale legacy key; merge once & remove legacy key
      const existingPairs = await storageGetAllRunsRaw(storage);
      const existingEntries: HistoryEntry[] = [];
      for (const [, val] of existingPairs) {
        const coerced = coerceStoredRun(val);
        if (coerced) existingEntries.push(coerced);
      }
      const merged = deduplicateAndSortDesc([...legacyEntries, ...existingEntries]);
      const pairs: [string, unknown][] = [
        [HISTORY_INDEX_KEY, buildCompactIndex(merged)],
        ...legacyEntries.map((e) => [runStorageKey(e.id), e] as [string, unknown]),
      ];
      await storageSetMany(storage, pairs);
      await storage.delete(HISTORY_STORAGE_KEY);
      historyCache.set(storage, merged);
      return merged;
    }

    const rawRuns = await storageGetAllRunsRaw(storage);
    if (rawRuns.length === 0) {
      if (Array.isArray(rawIndex) && rawIndex.length === 0) {
        historyCache.set(storage, []);
      } else {
        historyCache.delete(storage);
      }
      return [];
    }

    const byId = new Map<string, HistoryEntry>();
    for (const [, val] of rawRuns) {
      const coerced = coerceStoredRun(val);
      if (coerced) {
        byId.set(coerced.id, coerced);
      }
    }

    // Reconcile index if missing or out of sync with stored ttp:run:* records
    let entries: HistoryEntry[];
    if (Array.isArray(rawIndex)) {
      const ordered: HistoryEntry[] = [];
      const seen = new Set<string>();
      for (const item of rawIndex) {
        const parsedIdx = HistoryIndexItemSchema.safeParse(item);
        if (!parsedIdx.success) continue;
        const found = byId.get(parsedIdx.data.id);
        if (found && !seen.has(found.id)) {
          ordered.push(found);
          seen.add(found.id);
        }
      }
      if (ordered.length === byId.size) {
        entries = ordered;
      } else {
        for (const [id, entry] of byId.entries()) {
          if (!seen.has(id)) ordered.push(entry);
        }
        entries = ordered.sort((a, b) => b.date - a.date);
        await storage.set(HISTORY_INDEX_KEY, buildCompactIndex(entries));
      }
    } else {
      entries = Array.from(byId.values()).sort((a, b) => b.date - a.date);
      await storage.set(HISTORY_INDEX_KEY, buildCompactIndex(entries));
    }

    historyCache.set(storage, entries);
    return entries;
  } catch {
    return [];
  }
}

export async function saveRunToStorage(
  storage: Storage,
  entry: HistoryEntry,
  knownHistory?: readonly HistoryEntry[],
): Promise<{ list: HistoryEntry[]; ok: boolean }> {
  let existing = knownHistory ?? historyCache.get(storage);
  if (!existing) {
    existing = await loadHistoryFromStorage(storage);
  }

  let next: HistoryEntry[];
  const existingIdx = existing.findIndex((e) => e.id === entry.id);
  if (existingIdx === -1 && (existing.length === 0 || entry.date >= existing[0]!.date)) {
    next = [entry, ...existing];
  } else {
    const filtered = existingIdx === -1 ? existing : existing.filter((e) => e.id !== entry.id);
    next = [entry, ...filtered].sort((a, b) => b.date - a.date);
  }

  try {
    await storageSetMany(storage, [
      [runStorageKey(entry.id), entry],
      [HISTORY_INDEX_KEY, buildCompactIndex(next)],
    ]);
    historyCache.set(storage, next);
    return { list: next, ok: true };
  } catch {
    return { list: next, ok: false };
  }
}

export async function clearHistoryInStorage(
  storage: Storage,
  mode?: "all" | "drill",
): Promise<HistoryEntry[]> {
  if (!mode || mode === "all") {
    try {
      const runKeys = await storage.list(RUN_KEY_PREFIX);
      await storageDeleteMany(storage, [...runKeys, HISTORY_INDEX_KEY, HISTORY_STORAGE_KEY]);
    } catch {
      /* noop */
    }
    historyCache.set(storage, []);
    return [];
  }

  const current = await loadHistoryFromStorage(storage);
  const retained: HistoryEntry[] = [];
  const removedKeys: string[] = [];
  for (const h of current) {
    const keep = !isVisibleHistoryEntry(h);
    if (keep) retained.push(h);
    else removedKeys.push(runStorageKey(h.id));
  }

  try {
    await storageDeleteMany(storage, removedKeys);
    await storage.set(HISTORY_INDEX_KEY, buildCompactIndex(retained));
    historyCache.set(storage, retained);
  } catch {
    /* noop */
  }
  return retained;
}

export async function importHistoryToStorage(
  storage: Storage,
  json: string,
): Promise<ImportResult> {
  const parsed = parseImportHistoryResult(json);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  try {
    const current = await loadHistoryFromStorage(storage);
    const byId = new Map<string, HistoryEntry>();
    for (const e of current) byId.set(e.id, e);
    for (const e of parsed.entries) byId.set(e.id, e);
    const merged = Array.from(byId.values()).sort((a, b) => b.date - a.date);

    const pairs: [string, unknown][] = [
      [HISTORY_INDEX_KEY, buildCompactIndex(merged)],
      ...parsed.entries.map((e) => [runStorageKey(e.id), e] as [string, unknown]),
    ];
    await storageSetMany(storage, pairs);
    await storage.delete(HISTORY_STORAGE_KEY);
    historyCache.set(storage, merged);
    return { ok: true, list: merged };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export async function restoreHistoryToStorage(
  storage: Storage,
  entries: HistoryEntry[],
): Promise<HistoryEntry[]> {
  const valid = deduplicateAndSortDesc(parseHistoryEntries(entries));
  const validIds = new Set(valid.map((e) => e.id));
  const existingRunKeys = await storage.list(RUN_KEY_PREFIX);
  const obsoleteKeys = existingRunKeys.filter((k) => !validIds.has(k.slice(RUN_KEY_PREFIX.length)));

  if (obsoleteKeys.length > 0) {
    await storageDeleteMany(storage, obsoleteKeys);
  }
  const pairs: [string, unknown][] = [
    [HISTORY_INDEX_KEY, buildCompactIndex(valid)],
    ...valid.map((e) => [runStorageKey(e.id), e] as [string, unknown]),
  ];
  await storageSetMany(storage, pairs);
  await storage.delete(HISTORY_STORAGE_KEY);
  historyCache.set(storage, valid);
  return valid;
}

export async function deleteRunFromStorage(
  storage: Storage,
  id: string,
): Promise<{ deleted: HistoryEntry | null; list: HistoryEntry[] }> {
  const current = historyCache.get(storage) ?? (await loadHistoryFromStorage(storage));
  const deleted = current.find((e) => e.id === id) ?? null;
  if (!deleted) return { deleted: null, list: current };
  const next = current.filter((e) => e.id !== id);
  try {
    await storage.delete(runStorageKey(id));
    await storage.set(HISTORY_INDEX_KEY, buildCompactIndex(next));
    historyCache.set(storage, next);
  } catch {
    /* non-fatal */
  }
  return { deleted, list: next };
}

export async function loadBestSamplesFromStorage(
  storage: Storage,
  modeKey: string,
  difficulty?: string,
): Promise<number[] | undefined> {
  try {
    const scopedKey = bestSamplesKey(modeKey, difficulty);
    const scopedRaw = await storage.get(scopedKey);
    const parsedScoped = SamplesSchema.safeParse(scopedRaw);
    if (parsedScoped.success && parsedScoped.data.length > 0) {
      return clampMonotonicSamples(parsedScoped.data);
    }
    if (difficulty) {
      const legacyModeKey = bestSamplesKey(modeKey);
      const legacyRaw = await storage.get(legacyModeKey);
      const parsedLegacy = SamplesSchema.safeParse(legacyRaw);
      if (parsedLegacy.success && parsedLegacy.data.length > 0) {
        return clampMonotonicSamples(parsedLegacy.data);
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export async function saveBestSamplesToStorage(
  storage: Storage,
  modeKey: string,
  samples: readonly number[],
  difficulty?: string,
): Promise<void> {
  const clean = clampMonotonicSamples(samples).slice(0, 240);
  if (clean.length === 0) return;
  try {
    await storage.set(bestSamplesKey(modeKey, difficulty), clean);
  } catch {
    // non-fatal
  }
}

/** Stable unique id for a new run. */
export function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
