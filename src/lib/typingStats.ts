import { z } from "zod";

export interface RunStats {
  wpm: number;
  rawWpm: number;
  /** Net WPM, penalized for errors. */
  adjustedWpm: number;
  accuracy: number;
  correct: number;
  incorrect: number;
  typed: number;
  elapsed: number;
  consistency: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Cumulative per-second counts -> per-second deltas. */
export function toDeltas(cumulative: number[]): number[] {
  return cumulative.map((v, i, a) => (i === 0 ? v : v - (a[i - 1] ?? 0)));
}

export function computeStats(
  correct: number,
  incorrect: number,
  elapsedMs: number,
  samples: number[] = [],
): RunStats {
  // Clamp to >= 1s so the first keystroke doesn't divide by ~1ms and spike WPM.
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  const typed = correct + incorrect;
  const wpm = Math.max(0, correct / 5 / minutes);
  const rawWpm = typed / 5 / minutes;
  const adjustedWpm = Math.max(0, (correct - incorrect) / 5 / minutes);
  const accuracy = typed === 0 ? 100 : (correct / typed) * 100;

  let consistency = 100;
  if (samples.length > 1) {
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    consistency = Math.max(0, Math.min(100, 100 - cv * 100));
  }

  return {
    wpm: round(wpm),
    rawWpm: round(rawWpm),
    adjustedWpm: round(adjustedWpm),
    accuracy: round(accuracy),
    correct,
    incorrect,
    typed,
    elapsed: elapsedMs / 1000,
    consistency: round(consistency),
  };
}

export interface HistoryEntry extends RunStats {
  id: string;
  date: number;
  difficulty: string;
  mode: string;
  score?: number;
  wordsDestroyed?: number;
  level?: number;
}

export interface ShooterRunSummary {
  score: number;
  wordsDestroyed: number;
  accuracy: number;
  durationSec: number;
  difficulty: string;
  misses?: number;
  wrongKeys?: number;
  level?: number;
}

const KEY = "ttp:history:v1";
const LEGACY_KEY = "ttp:history";
const LIMIT = 100;

const isBrowser = () => typeof window !== "undefined" && !!window.localStorage;

/** Migrate the legacy unversioned key on first load. */
function migrateLegacy(): void {
  if (!isBrowser()) return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy && !window.localStorage.getItem(KEY)) {
      window.localStorage.setItem(KEY, legacy);
      window.localStorage.removeItem(LEGACY_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export const HistoryEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  date: z.number(),
  difficulty: z.string(),
  /** Legacy (pre-shooter) entries have no mode; they were standard 30s drills. */
  mode: z.string().default("30"),
  wpm: z.number(),
  rawWpm: z.number().default(0),
  adjustedWpm: z.number().default(0),
  accuracy: z.number(),
  correct: z.number().default(0),
  incorrect: z.number().default(0),
  typed: z.number().default(0),
  elapsed: z.number().default(0),
  consistency: z.number().default(100),
  score: z.number().optional(),
  wordsDestroyed: z.number().optional(),
  level: z.number().optional(),
});

export function loadHistory(): HistoryEntry[] {
  if (!isBrowser()) return [];
  migrateLegacy();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = z.array(HistoryEntrySchema).safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/** Persist and return the new list. `ok` is false when storage is unavailable/full. */
export function saveRun(entry: HistoryEntry): { list: HistoryEntry[]; ok: boolean } {
  const next = [entry, ...loadHistory()].sort((a, b) => b.date - a.date).slice(0, LIMIT);
  if (!isBrowser()) return { list: next, ok: false };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return { list: next, ok: true };
  } catch {
    return { list: next, ok: false };
  }
}

export function clearHistory(mode?: "all" | "drill" | "shooter"): HistoryEntry[] {
  if (!isBrowser()) return [];
  if (!mode || mode === "all") {
    try {
      window.localStorage.removeItem(KEY);
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
    window.localStorage.setItem(KEY, JSON.stringify(retained));
  } catch {
    /* noop */
  }
  return retained;
}

export function exportHistory(): string {
  return JSON.stringify(loadHistory(), null, 2);
}

export type ImportResult =
  { ok: true; list: HistoryEntry[] } | { ok: false; reason: "invalid" | "quota" };

/** Merge imported entries with existing history (deduped by id), newest-first with error detail. */
export function importHistoryResult(json: string): ImportResult {
  if (!isBrowser()) return { ok: false, reason: "invalid" };
  let parsedEntries: HistoryEntry[];
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw) || raw.length > 1000) return { ok: false, reason: "invalid" };
    const parsed = z.array(HistoryEntrySchema).safeParse(raw);
    if (!parsed.success) return { ok: false, reason: "invalid" };
    parsedEntries = parsed.data as HistoryEntry[];
  } catch {
    return { ok: false, reason: "invalid" };
  }

  try {
    const byId = new Map<string, HistoryEntry>();
    for (const e of loadHistory()) byId.set(e.id, e);
    for (const e of parsedEntries) byId.set(e.id, e);
    const merged = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(merged));
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

/** Stable unique id for a new run. */
export function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
