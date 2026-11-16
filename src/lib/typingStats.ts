import { z } from "zod";
import type { Storage } from "./storage";

export interface RunStats {
  wpm: number;
  rawWpm: number;
  /** Net WPM, penalized for uncorrected errors. */
  adjustedWpm: number;
  accuracy: number;
  correct: number;
  /** Total incorrect keystrokes (or errors in legacy/shooter runs). */
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
  score?: number | undefined;
  wordsDestroyed?: number | undefined;
  wordsSpawned?: number | undefined;
  hitRate?: number | undefined;
  maxStreak?: number | undefined;
  strayKeys?: number | undefined;
  bossesDefeated?: number | undefined;
  practiceMode?: boolean | undefined;
  dailyChallengeDate?: string | undefined;
  level?: number | undefined;
  samples?: number[] | undefined;
  errorSeconds?: number[] | undefined;
  mistakes?: Record<string, number> | undefined;
  missedWords?: string[] | undefined;
  slowWords?: RunSlowWord[] | undefined;
  wordMistakes?: Record<string, number> | undefined;
}

export interface ShooterRunSummary {
  score: number;
  wordsDestroyed: number;
  wordsSpawned?: number | undefined;
  charsDestroyed?: number | undefined;
  accuracy: number;
  hitRate?: number | undefined;
  maxStreak?: number | undefined;
  durationSec: number;
  activeDurationSec?: number | undefined;
  difficulty: string;
  misses?: number | undefined;
  wrongKeys?: number | undefined;
  strayKeys?: number | undefined;
  bossesDefeated?: number | undefined;
  practiceMode?: boolean | undefined;
  dailyChallengeDate?: string | undefined;
  level?: number | undefined;
  samples?: number[] | undefined;
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

/** Human-readable label for a mode key ("30" / "30s" -> "30s", "25w" -> "25 words", "quote" -> "Quote", "shooter" -> "Shooter"). */
export function formatModeLabel(mode: string): string {
  const normalized = normalizeModeKey(mode);
  if (normalized === "shooter") return "Shooter";
  if (normalized === "quote") return "Quote";
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

/** Filter history entries belonging to the same test type (mode + length, and difficulty where relevant). */
export function getModeHistory(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): HistoryEntry[] {
  const normalized = normalizeModeKey(modeKey);
  const compareDifficulty =
    difficulty !== undefined && normalized !== "quote" && normalized !== "shooter";
  return history.filter((h) => {
    if (normalizeModeKey(h.mode) !== normalized) return false;
    if (compareDifficulty && h.difficulty.toLowerCase() !== difficulty.toLowerCase()) return false;
    return true;
  });
}

/** Personal best WPM for a specific test type (mode + length, and difficulty where relevant). */
export function getPersonalBestWpm(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): number {
  return getModeHistory(history, modeKey, difficulty).reduce((m, h) => Math.max(m, h.wpm), 0);
}

/** Single source of truth for Word Shooter best score, derived directly from run history. */
export function getShooterBestScore(history: readonly HistoryEntry[]): number {
  return history.reduce((best, h) => {
    if (normalizeModeKey(h.mode) !== "shooter" || h.practiceMode) return best;
    return Math.max(best, h.score ?? 0);
  }, 0);
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
}

/**
 * Aggregate personal bests per test type (never mixing time lengths, word counts, quotes, or difficulties).
 */
export function computePersonalBestsTable(history: readonly HistoryEntry[]): PersonalBestRow[] {
  const drillEntries = history.filter((h) => normalizeModeKey(h.mode) !== "shooter");
  const groups = new Map<string, PersonalBestRow>();

  for (const h of drillEntries) {
    const modeKey = normalizeModeKey(h.mode || "30s");
    const difficulty = modeKey === "quote" ? "any" : h.difficulty.toLowerCase();
    const key = `${modeKey}:${difficulty}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        modeKey,
        modeLabel: formatModeLabel(modeKey),
        difficulty,
        bestWpm: round(h.wpm),
        bestAccuracy: round(h.accuracy),
        runs: 1,
        lastDate: h.date,
      });
    } else {
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
 * and (for non-quote/non-shooter modes) either an explicit difficulty or uniform difficulty across runs.
 */
export function computeSameTypeTrend(
  history: readonly HistoryEntry[],
  modeKey: string,
  difficulty?: string,
): SameTypeTrend | null {
  const normalized = normalizeModeKey(modeKey);
  if (!normalized || normalized === "all") return null;

  const isDifficultyInvariant = normalized === "quote" || normalized === "shooter";
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
  if (difficulty && normalized !== "quote" && normalized !== "shooter") {
    return `ttp:best:samples:v1:${normalized}:${difficulty.toLowerCase()}`;
  }
  return `ttp:best:samples:v1:${normalized}`;
}

export const HISTORY_STORAGE_KEY = "ttp:history:v1";
const LEGACY_KEY = "ttp:history";
const LEGACY_LOCAL_LIMIT = 100;

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

/** Migrate the legacy unversioned key on first load. */
function migrateLegacy(): void {
  if (!isBrowser()) return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy && !window.localStorage.getItem(HISTORY_STORAGE_KEY)) {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, legacy);
      window.localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export const RunSlowWordSchema = z.object({
  word: z.string().min(1).max(128),
  wpm: z.number().finite().min(0).max(5000),
  avgMs: z.number().finite().min(0).max(600000),
});

export const HistoryEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  date: z.number().finite().min(0),
  difficulty: z.string(),
  /** Legacy (pre-shooter) entries have no mode; they were standard 30s drills. */
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
  score: z.number().finite().min(0).optional(),
  wordsDestroyed: z.number().int().min(0).optional(),
  wordsSpawned: z.number().int().min(0).optional(),
  hitRate: z.number().finite().min(0).max(100).optional(),
  maxStreak: z.number().int().min(0).optional(),
  strayKeys: z.number().int().min(0).optional(),
  bossesDefeated: z.number().int().min(0).optional(),
  practiceMode: z.boolean().optional(),
  dailyChallengeDate: z.string().max(20).optional(),
  level: z.number().int().min(1).optional(),
  samples: z.array(z.number().finite().min(0)).max(3600).optional(),
  errorSeconds: z.array(z.number().finite().min(0).max(86400)).max(500).optional(),
  mistakes: z.record(z.string().min(1).max(4), z.number().int().min(1).max(100000)).optional(),
  missedWords: z.array(z.string().min(1).max(128)).max(100).optional(),
  slowWords: z.array(RunSlowWordSchema).max(20).optional(),
  wordMistakes: z.record(z.string().min(1).max(128), z.number().int().min(1).max(1000)).optional(),
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

export function loadHistory(): HistoryEntry[] {
  if (!isBrowser()) return [];
  migrateLegacy();
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return parseHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persist and return the new list. `ok` is false when storage is unavailable/full. */
export function saveRun(entry: HistoryEntry): { list: HistoryEntry[]; ok: boolean } {
  const next = [entry, ...loadHistory()]
    .sort((a, b) => b.date - a.date)
    .slice(0, LEGACY_LOCAL_LIMIT);
  if (!isBrowser()) return { list: next, ok: false };
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    return { list: next, ok: true };
  } catch {
    return { list: next, ok: false };
  }
}

export function clearHistory(mode?: "all" | "drill" | "shooter"): HistoryEntry[] {
  if (!isBrowser()) return [];
  if (!mode || mode === "all") {
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      /* noop */
    }
    return [];
  }
  const current = loadHistory();
  const retained =
    mode === "drill"
      ? current.filter((h) => h.mode === "shooter")
      : current.filter((h) => h.mode !== "shooter");
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(retained));
  } catch {
    /* noop */
  }
  return retained;
}

export interface HistoryExportPayload {
  schemaVersion: number;
  exportedAt: number;
  entries: HistoryEntry[];
}

export function exportHistoryPayload(entries = loadHistory()): HistoryExportPayload {
  return {
    schemaVersion: 1,
    exportedAt: Date.now(),
    entries,
  };
}

export function exportHistory(): string {
  return JSON.stringify(exportHistoryPayload(), null, 2);
}

export type ImportResult =
  { ok: true; list: HistoryEntry[] } | { ok: false; reason: "invalid" | "quota" };

export function parseImportHistoryJson(json: string): HistoryEntry[] | null {
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
    if (!Array.isArray(itemsToParse) || itemsToParse.length > 5000) return null;
    const parsed = z.array(HistoryEntrySchema).safeParse(itemsToParse);
    if (!parsed.success) return null;
    return parsed.data as HistoryEntry[];
  } catch {
    return null;
  }
}

/** Merge imported entries with existing history (deduped by id), newest-first with error detail. */
export function importHistoryResult(json: string): ImportResult {
  if (!isBrowser()) return { ok: false, reason: "invalid" };
  const parsedEntries = parseImportHistoryJson(json);
  if (!parsedEntries) return { ok: false, reason: "invalid" };

  try {
    const byId = new Map<string, HistoryEntry>();
    for (const e of loadHistory()) byId.set(e.id, e);
    for (const e of parsedEntries) byId.set(e.id, e);
    const merged = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, LEGACY_LOCAL_LIMIT);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(merged));
    return { ok: true, list: merged };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

/** Merge imported entries with existing history (deduped by id), newest-first. */
export function importHistory(json: string): HistoryEntry[] | null {
  const res = importHistoryResult(json);
  return res.ok ? res.list : null;
}

/** Async IndexedDB Storage API (no 100-run cap). */
export async function loadHistoryFromStorage(storage: Storage): Promise<HistoryEntry[]> {
  try {
    const raw = await storage.get(HISTORY_STORAGE_KEY);
    if (raw === null) return [];
    const entries = parseHistoryEntries(raw);
    return [...entries].sort((a, b) => b.date - a.date);
  } catch {
    return [];
  }
}

export async function saveRunToStorage(
  storage: Storage,
  entry: HistoryEntry,
): Promise<{ list: HistoryEntry[]; ok: boolean }> {
  const existing = await loadHistoryFromStorage(storage);
  const next = [entry, ...existing.filter((e) => e.id !== entry.id)].sort(
    (a, b) => b.date - a.date,
  );
  try {
    await storage.set(HISTORY_STORAGE_KEY, next);
    return { list: next, ok: true };
  } catch {
    return { list: next, ok: false };
  }
}

export async function clearHistoryInStorage(
  storage: Storage,
  mode?: "all" | "drill" | "shooter",
): Promise<HistoryEntry[]> {
  if (!mode || mode === "all") {
    try {
      await storage.delete(HISTORY_STORAGE_KEY);
    } catch {
      /* noop */
    }
    return [];
  }
  const current = await loadHistoryFromStorage(storage);
  const retained =
    mode === "drill"
      ? current.filter((h) => h.mode === "shooter")
      : current.filter((h) => h.mode !== "shooter");
  try {
    await storage.set(HISTORY_STORAGE_KEY, retained);
  } catch {
    /* noop */
  }
  return retained;
}

export async function importHistoryToStorage(
  storage: Storage,
  json: string,
): Promise<ImportResult> {
  const parsedEntries = parseImportHistoryJson(json);
  if (!parsedEntries) return { ok: false, reason: "invalid" };
  try {
    const byId = new Map<string, HistoryEntry>();
    for (const e of await loadHistoryFromStorage(storage)) byId.set(e.id, e);
    for (const e of parsedEntries) byId.set(e.id, e);
    const merged = [...byId.values()].sort((a, b) => b.date - a.date);
    await storage.set(HISTORY_STORAGE_KEY, merged);
    return { ok: true, list: merged };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export async function restoreHistoryToStorage(
  storage: Storage,
  entries: HistoryEntry[],
): Promise<HistoryEntry[]> {
  const valid = parseHistoryEntries(entries).sort((a, b) => b.date - a.date);
  await storage.set(HISTORY_STORAGE_KEY, valid);
  return valid;
}

export async function deleteRunFromStorage(
  storage: Storage,
  id: string,
): Promise<{ deleted: HistoryEntry | null; list: HistoryEntry[] }> {
  const current = await loadHistoryFromStorage(storage);
  const deleted = current.find((e) => e.id === id) ?? null;
  if (!deleted) return { deleted: null, list: current };
  const next = current.filter((e) => e.id !== id);
  try {
    await storage.set(HISTORY_STORAGE_KEY, next);
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
