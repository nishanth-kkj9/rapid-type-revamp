import { z } from "zod";
import type { Storage } from "./storage";

export const MISSED_WORDS_KEY = "ttp:missed-words:v1";
export const MAX_MISSED_WORDS = 40;
export const GRADUATION_STREAK = 3;

export interface MissedWordRecord {
  word: string;
  cleanStreak: number;
  lastSeenAt: number;
}

export const MissedWordRecordSchema = z.object({
  word: z.string().min(1).max(24),
  cleanStreak: z.number().int().min(0).max(GRADUATION_STREAK),
  lastSeenAt: z.number().finite(),
});

export const MissedWordsSchema = z.union([z.array(z.string()), z.array(MissedWordRecordSchema)]);

export function sanitizeMissedWordRecords(raw: unknown): MissedWordRecord[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: MissedWordRecord[] = [];

  for (const item of raw) {
    let word = "";
    let cleanStreak = 0;
    let lastSeenAt = 0;

    if (typeof item === "string") {
      word = item.trim().toLowerCase();
    } else {
      const parsed = MissedWordRecordSchema.safeParse(item);
      if (!parsed.success) continue;
      word = parsed.data.word.trim().toLowerCase();
      cleanStreak = parsed.data.cleanStreak;
      lastSeenAt = parsed.data.lastSeenAt;
    }

    if (word.length === 0 || word.length > 24) continue;
    if (cleanStreak >= GRADUATION_STREAK) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    clean.push({ word, cleanStreak, lastSeenAt });
    if (clean.length >= MAX_MISSED_WORDS) break;
  }

  return clean;
}

export function sanitizeMissedWords(raw: unknown): string[] {
  return getActiveMissedWords(sanitizeMissedWordRecords(raw));
}

export function getActiveMissedWords(records: readonly MissedWordRecord[]): string[] {
  return records.filter((r) => r.cleanStreak < GRADUATION_STREAK).map((r) => r.word);
}

export function loadMissedWords(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(MISSED_WORDS_KEY);
    if (!raw) return [];
    return sanitizeMissedWords(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveMissedWords(words: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const clean = sanitizeMissedWords(words);
    window.localStorage.setItem(MISSED_WORDS_KEY, JSON.stringify(clean));
  } catch {
    // storage disabled or quota exceeded
  }
}

export function mergeMissedWords(existing: string[], fresh: string[]): string[] {
  return sanitizeMissedWords([...fresh, ...existing]);
}

/**
 * Spaced-repetition update across runs:
 * - Any word missed in the run enters or resets cleanStreak = 0.
 * - Any tracked word typed cleanly in the run advances cleanStreak += 1 (max +1 per run).
 * - Words reaching GRADUATION_STREAK (3 clean runs) graduate out of the active queue.
 */
export function recordMissedWordsRun(
  existing: readonly MissedWordRecord[],
  opts: {
    missedInRun: readonly string[];
    cleanWordsInRun: readonly string[];
    nowMs?: number;
  },
): MissedWordRecord[] {
  const now = opts.nowMs ?? Date.now();
  const missedSet = new Set(
    opts.missedInRun
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0 && w.length <= 24),
  );
  const cleanSet = new Set(
    opts.cleanWordsInRun
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0 && w.length <= 24 && !missedSet.has(w)),
  );

  const byWord = new Map<string, MissedWordRecord>();
  for (const rec of existing) {
    const w = rec.word.trim().toLowerCase();
    if (!w || rec.cleanStreak >= GRADUATION_STREAK) continue;
    byWord.set(w, { ...rec, word: w });
  }

  // Advance clean streak once per separate run for tracked words typed cleanly
  for (const [w, rec] of byWord) {
    if (cleanSet.has(w)) {
      const nextStreak = rec.cleanStreak + 1;
      if (nextStreak >= GRADUATION_STREAK) {
        byWord.delete(w);
      } else {
        byWord.set(w, { word: w, cleanStreak: nextStreak, lastSeenAt: now });
      }
    }
  }

  // Newly missed words reset streak to 0 and float to the front
  const freshRecords: MissedWordRecord[] = [];
  for (const w of missedSet) {
    byWord.delete(w);
    freshRecords.push({ word: w, cleanStreak: 0, lastSeenAt: now });
  }

  // Prioritize words needing practice (lowest streak, oldest seen first among same streak)
  const remaining = Array.from(byWord.values()).sort(
    (a, b) => a.cleanStreak - b.cleanStreak || a.lastSeenAt - b.lastSeenAt,
  );

  return [...freshRecords, ...remaining].slice(0, MAX_MISSED_WORDS);
}

export function clearMissedWords(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(MISSED_WORDS_KEY);
  } catch {
    // storage disabled
  }
}

export async function loadMissedWordRecordsFromStorage(
  storage: Storage,
): Promise<MissedWordRecord[]> {
  try {
    const raw = await storage.get(MISSED_WORDS_KEY);
    if (raw === null) return [];
    const parsed = MissedWordsSchema.safeParse(raw);
    return parsed.success ? sanitizeMissedWordRecords(parsed.data) : [];
  } catch {
    return [];
  }
}

export async function saveMissedWordRecordsToStorage(
  storage: Storage,
  records: MissedWordRecord[],
): Promise<MissedWordRecord[]> {
  const clean = sanitizeMissedWordRecords(records);
  try {
    await storage.set(MISSED_WORDS_KEY, clean);
  } catch {
    // non-fatal
  }
  return clean;
}

export async function loadMissedWordsFromStorage(storage: Storage): Promise<string[]> {
  return getActiveMissedWords(await loadMissedWordRecordsFromStorage(storage));
}

export async function saveMissedWordsToStorage(
  storage: Storage,
  words: string[],
): Promise<string[]> {
  const clean = sanitizeMissedWordRecords(words);
  await saveMissedWordRecordsToStorage(storage, clean);
  return getActiveMissedWords(clean);
}
