export interface RunStats {
  wpm: number;
  rawWpm: number;
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
  const next = [entry, ...loadHistory()].slice(0, 50);
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
