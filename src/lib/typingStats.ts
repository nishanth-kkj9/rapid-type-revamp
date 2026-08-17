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
    const variance =
      samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
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

const HistoryEntrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  date: z.number(),
  difficulty: z.string(),
  mode: z.string(),
  wpm: z.number(),
  rawWpm: z.number().default(0),
  adjustedWpm: z.number().default(0),
  accuracy: z.number(),
  correct: z.number().default(0),
  incorrect: z.number().default(0),
  typed: z.number().default(0),
  elapsed: z.number().default(0),
  consistency: z.number().default(100),
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
  const next = [entry, ...loadHistory()]
    .sort((a, b) => b.date - a.date)
    .slice(0, LIMIT);
  if (!isBrowser()) return { list: next, ok: false };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return { list: next, ok: true };
  } catch {
    return { list: next, ok: false };
  }
}

export function clearHistory(): HistoryEntry[] {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* noop */
    }
  }
  return [];
}

export function exportHistory(): string {
  return JSON.stringify(loadHistory(), null, 2);
}

/** Merge imported entries with existing history (deduped by id), newest-first. */
export function importHistory(json: string): HistoryEntry[] | null {
  if (!isBrowser()) return null;
  try {
    const parsed = z.array(HistoryEntrySchema).safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const byId = new Map<string, HistoryEntry>();
    for (const e of loadHistory()) byId.set(e.id, e);
    for (const e of parsed.data as HistoryEntry[]) byId.set(e.id, e);
    const merged = [...byId.values()]
      .sort((a, b) => b.date - a.date)
      .slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return null;
  }
}

/** Stable unique id for a new run. */
export function newRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
