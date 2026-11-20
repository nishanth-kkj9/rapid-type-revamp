import { z } from "./zodSetup";
import type { Storage } from "./storage";

/**
 * Lifetime per-key and per-bigram mistake statistics, persisted across sessions.
 * Powers all-time problem-key display and adaptive weak-key + bigram practice.
 */
export const KEY_STATS_KEY = "ttp:keystats:v1";
export const KEY_BIGRAMS_KEY = "ttp:keybigrams:v1";
const MAX_KEYS = 64;
const MAX_BIGRAMS = 96;

export const KeyStatsSchema = z.record(
  z.string().length(1),
  z.number().int().min(1).max(1_000_000),
);

export const KeyBigramsSchema = z.record(
  z.string().length(2),
  z.number().int().min(1).max(1_000_000),
);

export function sanitizeKeyStats(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof k === "string" &&
      k.length === 1 &&
      typeof v === "number" &&
      Number.isInteger(v) &&
      v > 0 &&
      v <= 1_000_000
    ) {
      out[k] = v;
    }
  }
  return out;
}

export function sanitizeKeyBigrams(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof k === "string" &&
      k.length === 2 &&
      /^[a-z]{2}$/.test(k) &&
      typeof v === "number" &&
      Number.isInteger(v) &&
      v > 0 &&
      v <= 1_000_000
    ) {
      out[k] = v;
    }
  }
  return out;
}

function mergeAndCapMap(
  existing: Record<string, number>,
  mistakes: Record<string, number>,
  expectedLength: number,
  maxItems: number,
  alphaOnly = false,
): Record<string, number> {
  const merged = { ...existing };
  for (const [k, v] of Object.entries(mistakes)) {
    if (
      typeof k === "string" &&
      k.length === expectedLength &&
      (!alphaOnly || /^[a-z]{2}$/.test(k)) &&
      Number.isInteger(v) &&
      v > 0
    ) {
      merged[k] = (merged[k] ?? 0) + v;
    }
  }
  const entries = Object.entries(merged)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);
  return Object.fromEntries(entries);
}

export async function loadKeyStatsFromStorage(storage: Storage): Promise<Record<string, number>> {
  try {
    const raw = await storage.get(KEY_STATS_KEY);
    if (raw === null) return {};
    const parsed = KeyStatsSchema.safeParse(raw);
    return parsed.success ? parsed.data : sanitizeKeyStats(raw);
  } catch {
    return {};
  }
}

export async function recordKeyMistakesInStorage(
  storage: Storage,
  mistakes: Record<string, number>,
): Promise<Record<string, number>> {
  const current = await loadKeyStatsFromStorage(storage);
  const capped = mergeAndCapMap(current, mistakes, 1, MAX_KEYS);
  try {
    await storage.set(KEY_STATS_KEY, capped);
  } catch {
    // non-fatal
  }
  return capped;
}

export async function loadKeyBigramsFromStorage(storage: Storage): Promise<Record<string, number>> {
  try {
    const raw = await storage.get(KEY_BIGRAMS_KEY);
    if (raw === null) return {};
    const parsed = KeyBigramsSchema.safeParse(raw);
    return parsed.success ? sanitizeKeyBigrams(parsed.data) : sanitizeKeyBigrams(raw);
  } catch {
    return {};
  }
}

export async function recordKeyBigramsInStorage(
  storage: Storage,
  bigrams: Record<string, number>,
): Promise<Record<string, number>> {
  const current = await loadKeyBigramsFromStorage(storage);
  const capped = mergeAndCapMap(current, bigrams, 2, MAX_BIGRAMS, true);
  try {
    await storage.set(KEY_BIGRAMS_KEY, capped);
  } catch {
    // non-fatal
  }
  return capped;
}

/** Weak keys, worst first. */
export function topWeakKeys(stats: Record<string, number>, limit = 12): string[] {
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Weak two-letter combinations (bigrams), worst first. */
export function topWeakBigrams(stats: Record<string, number>, limit = 10): string[] {
  return Object.entries(stats)
    .filter(([k]) => /^[a-z]{2}$/.test(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export function scoreWordForWeakTargets(
  word: string,
  weakKeys: readonly string[],
  weakBigrams: readonly string[] = [],
): number {
  const lower = word.toLowerCase();
  let score = 0;

  // Bigrams carry higher priority because transitions are harder to target organically
  weakBigrams.forEach((bg, idx) => {
    const bgLower = bg.toLowerCase();
    if (bgLower.length === 2 && lower.includes(bgLower)) {
      score += 6 + Math.max(1, weakBigrams.length - idx);
    }
  });

  weakKeys.forEach((k, idx) => {
    const key = k.toLowerCase();
    if (!key || key === " ") return;
    let hits = 0;
    for (const ch of lower) {
      if (ch === key) hits += 1;
    }
    if (hits > 0) {
      const rankWeight = Math.max(1, Math.ceil((weakKeys.length - idx) / 2));
      score += hits * rankWeight;
    }
  });

  return score;
}

/**
 * Pick the candidate passage that contains the most weak-key characters and bigrams.
 */
export function pickWeakKeyPassage(
  candidates: string[],
  weakKeys: string[],
  weakBigrams: string[] = [],
): string {
  if (candidates.length === 0) return "";
  if (weakKeys.length === 0 && weakBigrams.length === 0) return candidates[0]!;
  let best = candidates[0]!;
  let bestScore = -1;
  for (const c of candidates) {
    const score = scoreWordForWeakTargets(c, weakKeys, weakBigrams);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
