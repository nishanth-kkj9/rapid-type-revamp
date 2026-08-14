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

export function computeStats(
  correct: number,
  incorrect: number,
  elapsedMs: number,
  samples: number[] = [],
): RunStats {
  const minutes = Math.max(elapsedMs, 1) / 60000;
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

const round = (n: number) => Math.round(n * 10) / 10;

export interface HistoryEntry extends RunStats {
  id: string;
  date: number;
  difficulty: string;
  mode: string;
}

const KEY = "ttp:history";
const LIMIT = 100;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}

export function clearHistory(): HistoryEntry[] {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  return [];
}

export function exportHistory(): string {
  return JSON.stringify(loadHistory(), null, 2);
}

export function importHistory(json: string): HistoryEntry[] | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.every(
      (p) =>
        p &&
        p.id &&
        p.date &&
        typeof p.wpm === "number" &&
        typeof p.accuracy === "number",
    );
    if (!valid) return null;
    const next = (parsed as HistoryEntry[]).slice(0, LIMIT);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}
