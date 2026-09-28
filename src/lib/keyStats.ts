/**
 * Lifetime per-key mistake statistics, persisted across sessions.
 * Powers all-time problem-key display and weak-key focus practice.
 */
export const KEY_STATS_KEY = "ttp:keystats:v1";
const MAX_KEYS = 64;

function sanitize(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof k === "string" &&
      k.length === 1 &&
      Number.isInteger(v) &&
      (v as number) > 0 &&
      (v as number) <= 1_000_000
    ) {
      out[k] = v as number;
    }
  }
  return out;
}

export function loadKeyStats(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_STATS_KEY);
    if (!raw) return {};
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

/** Merge one run's mistake map into the persisted stats. Returns the new map. */
export function recordKeyMistakes(mistakes: Record<string, number>): Record<string, number> {
  const merged = loadKeyStats();
  for (const [k, v] of Object.entries(mistakes)) {
    if (typeof k === "string" && k.length === 1 && Number.isInteger(v) && v > 0) {
      merged[k] = (merged[k] ?? 0) + v;
    }
  }
  // Cap: keep only the 64 highest-count keys (drops zero/negative noise first).
  const entries = Object.entries(merged)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYS);
  const capped: Record<string, number> = Object.fromEntries(entries);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY_STATS_KEY, JSON.stringify(capped));
    } catch {
      // quota-safe: stats are non-critical, drop the write
    }
  }
  return capped;
}

export function clearKeyStats(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY_STATS_KEY);
  } catch {
    // ignore
  }
}

/** Weak keys, worst first. */
export function topWeakKeys(stats: Record<string, number>, limit = 12): string[] {
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/**
 * Pick the candidate passage that contains the most weak-key characters
 * (case-insensitive; whitespace ignored). Deterministic: ties go to the
 * earliest candidate; empty weak list returns the first candidate.
 */
export function pickWeakKeyPassage(candidates: string[], weakKeys: string[]): string {
  if (candidates.length === 0) return "";
  const weights = new Map<string, number>();
  for (const k of weakKeys) {
    if (k && k !== " ") {
      const key = k.toLowerCase();
      weights.set(key, (weights.get(key) ?? 0) + 1);
    }
  }
  if (weights.size === 0) return candidates[0]!;
  let best = candidates[0]!;
  let bestScore = -1;
  for (const c of candidates) {
    const lower = c.toLowerCase();
    let score = 0;
    for (const [k, w] of weights) {
      for (const ch of lower) {
        if (ch === k) score += w;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
