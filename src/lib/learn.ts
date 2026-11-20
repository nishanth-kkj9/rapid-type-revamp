import { z } from "./zodSetup";
import type { Storage } from "./storage";
import type { KeySpeedMap } from "./keySpeed";
import wordLists from "./wordLists.json";

/**
 * Guided step-by-step touch typing (Learn mode).
 * Plain deterministic thresholds, counters, bigram pseudo-words, and seeded PRNG — no AI.
 */

export const LEARN_STORAGE_KEY = "ttp:learn:v1";
export const INITIAL_UNLOCKED_COUNT = 6;
export const DEFAULT_LEARN_TARGET_WPM = 35;
export const MIN_LEARN_TARGET_WPM = 20;
export const MAX_LEARN_TARGET_WPM = 80;
export const LEARN_ACCURACY_THRESHOLD = 0.94;
export const LEARN_MIN_KEY_HITS = 30;
export const LEARN_PUNCTUATION_UNLOCK_COUNT = 20;
export const LEARN_LESSON_MIN_WORDS = 35;
export const LEARN_LESSON_MAX_WORDS = 40;
export const LEARN_FOCUS_KEY_MIN_RATIO = 0.4;
export const LEARN_REPEAT_WINDOW = 20;

export const LETTER_ORDER = [
  "e",
  "t",
  "a",
  "o",
  "i",
  "n",
  "s",
  "h",
  "r",
  "d",
  "l",
  "c",
  "u",
  "m",
  "w",
  "f",
  "g",
  "y",
  "p",
  "b",
  "v",
  "k",
  "j",
  "x",
  "q",
  "z",
] as const;

export type LearnLetter = (typeof LETTER_ORDER)[number];

const LETTER_RANK = new Map<string, number>(LETTER_ORDER.map((ch, idx) => [ch, idx]));
const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

export interface LearnKeyStats {
  emaMs: number;
  hits: number;
  errors: number;
  /**
   * Exponential moving average of recent per-hit accuracy (0..1).
   * Documented choice: an accuracy EMA lets learners recover cleanly from early mistakes
   * while requiring >= 30 cumulative hits. When absent (e.g. imported/synthetic data),
   * falls back to cumulative `(hits - errors) / hits`.
   */
  recentAcc?: number | undefined;
}

export interface LearnState {
  unlocked: string[];
  perKey: Record<string, LearnKeyStats>;
  targetWpm: number;
  lessons: number;
  updatedAt: number;
}

export const LearnKeyStatsSchema = z.object({
  emaMs: z.number().finite().min(0).max(10_000),
  hits: z.number().int().min(0).max(10_000_000),
  errors: z.number().int().min(0).max(10_000_000),
  recentAcc: z.number().finite().min(0).max(1).optional(),
});

export const LearnStateSchema = z.object({
  unlocked: z.array(z.string().length(1)).min(INITIAL_UNLOCKED_COUNT).max(LETTER_ORDER.length),
  perKey: z.record(z.string().length(1), LearnKeyStatsSchema),
  targetWpm: z.number().finite().min(MIN_LEARN_TARGET_WPM).max(MAX_LEARN_TARGET_WPM),
  lessons: z.number().int().min(0).max(10_000_000),
  updatedAt: z.number().finite().min(0),
});

export function clampLearnTargetWpm(wpm: number): number {
  if (!Number.isFinite(wpm)) return DEFAULT_LEARN_TARGET_WPM;
  const rounded = Math.round(wpm);
  return Math.max(MIN_LEARN_TARGET_WPM, Math.min(MAX_LEARN_TARGET_WPM, rounded));
}

export function createInitialLearnState(now = 0): LearnState {
  return {
    unlocked: LETTER_ORDER.slice(0, INITIAL_UNLOCKED_COUNT),
    perKey: {},
    targetWpm: DEFAULT_LEARN_TARGET_WPM,
    lessons: 0,
    updatedAt: now,
  };
}

function normalizeUnlockedList(rawUnlocked: unknown): string[] {
  const seen = new Set<string>(LETTER_ORDER.slice(0, INITIAL_UNLOCKED_COUNT));
  if (Array.isArray(rawUnlocked)) {
    for (const item of rawUnlocked) {
      if (typeof item === "string") {
        const lower = item.trim().toLowerCase();
        if (LETTER_RANK.has(lower)) {
          seen.add(lower);
        }
      }
    }
  }
  return Array.from(seen).sort((a, b) => (LETTER_RANK.get(a) ?? 99) - (LETTER_RANK.get(b) ?? 99));
}

export function sanitizeLearnState(raw: unknown): LearnState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return createInitialLearnState();
  }
  const obj = raw as Record<string, unknown>;
  const unlocked = normalizeUnlockedList(obj["unlocked"]);

  const perKey: Record<string, LearnKeyStats> = {};
  const rawPerKey = obj["perKey"];
  if (rawPerKey && typeof rawPerKey === "object" && !Array.isArray(rawPerKey)) {
    for (const [rawChar, rawStats] of Object.entries(rawPerKey as Record<string, unknown>)) {
      const ch = rawChar.trim().toLowerCase();
      if (!LETTER_RANK.has(ch)) continue;
      const parsed = LearnKeyStatsSchema.safeParse(rawStats);
      if (parsed.success) {
        const cleanErrors = Math.min(parsed.data.errors, parsed.data.hits);
        perKey[ch] = {
          emaMs: parsed.data.emaMs,
          hits: parsed.data.hits,
          errors: cleanErrors,
          ...(parsed.data.recentAcc !== undefined ? { recentAcc: parsed.data.recentAcc } : {}),
        };
      }
    }
  }

  const rawTargetWpm = obj["targetWpm"];
  const targetWpm =
    typeof rawTargetWpm === "number" ? clampLearnTargetWpm(rawTargetWpm) : DEFAULT_LEARN_TARGET_WPM;
  const rawLessons = obj["lessons"];
  const lessons =
    typeof rawLessons === "number" && Number.isInteger(rawLessons) && rawLessons >= 0
      ? Math.min(10_000_000, rawLessons)
      : 0;
  const rawUpdatedAt = obj["updatedAt"];
  const updatedAt =
    typeof rawUpdatedAt === "number" && Number.isFinite(rawUpdatedAt) && rawUpdatedAt >= 0
      ? rawUpdatedAt
      : 0;

  return {
    unlocked,
    perKey,
    targetWpm,
    lessons,
    updatedAt,
  };
}

export function mergeLearnStates(current: LearnState, incoming: LearnState): LearnState {
  const unlocked = normalizeUnlockedList([...current.unlocked, ...incoming.unlocked]);
  const perKey: Record<string, LearnKeyStats> = { ...current.perKey };

  for (const [k, inc] of Object.entries(incoming.perKey)) {
    const cur = perKey[k];
    if (!cur) {
      perKey[k] = { ...inc };
    } else if (inc.hits > cur.hits) {
      perKey[k] = { ...inc };
    }
  }

  const currentIsPristine =
    current.lessons === 0 &&
    Object.keys(current.perKey).length === 0 &&
    current.unlocked.length === INITIAL_UNLOCKED_COUNT;

  return {
    unlocked,
    perKey,
    targetWpm:
      currentIsPristine || incoming.updatedAt >= current.updatedAt
        ? incoming.targetWpm
        : current.targetWpm,
    lessons: Math.max(current.lessons, incoming.lessons),
    updatedAt: Math.max(current.updatedAt, incoming.updatedAt),
  };
}

export async function loadLearnFromStorage(storage: Storage): Promise<LearnState> {
  try {
    const raw = await storage.get(LEARN_STORAGE_KEY);
    if (raw === null) return createInitialLearnState();
    return sanitizeLearnState(raw);
  } catch {
    return createInitialLearnState();
  }
}

export async function saveLearnToStorage(storage: Storage, state: LearnState): Promise<void> {
  try {
    await storage.set(LEARN_STORAGE_KEY, sanitizeLearnState(state));
  } catch {
    // non-fatal
  }
}

/** Max allowed ms per char for `targetWpm`: 60000 / (WPM * 5) = 12000 / WPM. */
export function targetMsForWpm(targetWpm: number): number {
  return 12000 / clampLearnTargetWpm(targetWpm);
}

/** Convert ms per char to equivalent WPM (at 5 chars per word). */
export function wpmFromMs(ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round(12000 / Math.max(40, ms));
}

/**
 * Recent accuracy ratio (0..1) for a key.
 * Uses stored accuracy EMA when present, falling back to cumulative clean hit ratio.
 */
export function getKeyRecentAccuracy(stats: LearnKeyStats | undefined): number {
  if (!stats || stats.hits <= 0) return 0;
  if (stats.recentAcc !== undefined) {
    return Math.max(0, Math.min(1, stats.recentAcc));
  }
  return Math.max(0, Math.min(1, (stats.hits - stats.errors) / stats.hits));
}

export function isKeyFastEnough(stats: LearnKeyStats | undefined, targetWpm: number): boolean {
  return Boolean(
    stats && stats.hits > 0 && stats.emaMs > 0 && stats.emaMs <= targetMsForWpm(targetWpm),
  );
}

export function isKeyAccurate(stats: LearnKeyStats | undefined): boolean {
  return Boolean(
    stats &&
    stats.hits >= LEARN_MIN_KEY_HITS &&
    getKeyRecentAccuracy(stats) >= LEARN_ACCURACY_THRESHOLD,
  );
}

export function isKeyMastered(stats: LearnKeyStats | undefined, targetWpm: number): boolean {
  return isKeyFastEnough(stats, targetWpm) && isKeyAccurate(stats);
}

export function getNextLockedLetter(unlocked: readonly string[]): string | null {
  const unlockedSet = new Set(unlocked.map((c) => c.toLowerCase()));
  for (const ch of LETTER_ORDER) {
    if (!unlockedSet.has(ch)) return ch;
  }
  return null;
}

/**
 * Determine which unlocked letter should be emphasized in the next lesson.
 * Prefers the newest unlocked letter if unmastered; otherwise targets the slowest/weakest unlocked key.
 */
export function getFocusKey(state: LearnState): string {
  const unlocked =
    state.unlocked.length > 0 ? state.unlocked : LETTER_ORDER.slice(0, INITIAL_UNLOCKED_COUNT);
  for (let i = unlocked.length - 1; i >= 0; i--) {
    const ch = unlocked[i]!;
    if (!isKeyMastered(state.perKey[ch], state.targetWpm)) {
      return ch;
    }
  }
  let slowest = unlocked[unlocked.length - 1]!;
  let slowestMs = -1;
  for (const ch of unlocked) {
    const ms = state.perKey[ch]?.emaMs ?? 9999;
    if (ms > slowestMs) {
      slowestMs = ms;
      slowest = ch;
    }
  }
  return slowest;
}

export interface LearnLessonInput {
  keyHits: Record<string, number>;
  keySpeed: KeySpeedMap;
  mistakes: Record<string, number>;
  now?: number | undefined;
}

export interface LearnLessonUpdateResult {
  state: LearnState;
  prevPerKey: Record<string, LearnKeyStats>;
  newlyMasteredKeys: string[];
  newlyUnlockedKey: string | null;
}

const ACC_HIT_ALPHA = 0.04;

export function applyLearnLessonUpdate(
  state: LearnState,
  input: LearnLessonInput,
): LearnLessonUpdateResult {
  const now = input.now ?? Date.now();
  const prevPerKey: Record<string, LearnKeyStats> = {};
  for (const [k, v] of Object.entries(state.perKey)) {
    prevPerKey[k] = { ...v };
  }

  // Aggregate per lowercase ASCII letter
  const aggHits: Record<string, number> = {};
  for (const [rawK, count] of Object.entries(input.keyHits)) {
    const k = rawK.toLowerCase();
    if (LETTER_RANK.has(k) && count > 0) {
      aggHits[k] = (aggHits[k] ?? 0) + count;
    }
  }

  const aggErrors: Record<string, number> = {};
  for (const [rawK, count] of Object.entries(input.mistakes)) {
    const k = rawK.toLowerCase();
    if (LETTER_RANK.has(k) && count > 0) {
      aggErrors[k] = (aggErrors[k] ?? 0) + count;
    }
  }

  const aggSpeedMs: Record<string, { totalMs: number; count: number }> = {};
  for (const [rawK, entry] of Object.entries(input.keySpeed)) {
    const k = rawK.toLowerCase();
    if (LETTER_RANK.has(k) && entry[1] > 0) {
      const prev = aggSpeedMs[k] ?? { totalMs: 0, count: 0 };
      aggSpeedMs[k] = { totalMs: prev.totalMs + entry[0], count: prev.count + entry[1] };
    }
  }

  const nextPerKey: Record<string, LearnKeyStats> = { ...prevPerKey };
  const touchedKeys = new Set([
    ...Object.keys(aggHits),
    ...Object.keys(aggErrors),
    ...Object.keys(aggSpeedMs),
  ]);

  for (const ch of touchedKeys) {
    const prev = nextPerKey[ch];
    const hitDelta = Math.max(aggHits[ch] ?? 0, aggErrors[ch] ?? 0, aggSpeedMs[ch]?.count ?? 0);
    const errDelta = Math.min(hitDelta, aggErrors[ch] ?? 0);
    const speedBatch = aggSpeedMs[ch];

    const nextHits = (prev?.hits ?? 0) + hitDelta;
    const nextErrors = (prev?.errors ?? 0) + errDelta;

    let nextEmaMs = prev?.emaMs ?? 0;
    if (speedBatch && speedBatch.count > 0) {
      const batchAvgMs = Math.max(40, Math.min(2000, speedBatch.totalMs / speedBatch.count));
      if (nextEmaMs <= 0) {
        nextEmaMs = Math.round(batchAvgMs);
      } else {
        const speedAlpha = Math.min(0.65, 1 - Math.pow(0.82, Math.max(1, speedBatch.count)));
        nextEmaMs = Math.round(nextEmaMs * (1 - speedAlpha) + batchAvgMs * speedAlpha);
      }
    }

    let nextRecentAcc = prev?.recentAcc;
    if (hitDelta > 0) {
      const batchAcc = Math.max(0, Math.min(1, (hitDelta - errDelta) / hitDelta));
      const baseAcc =
        nextRecentAcc !== undefined
          ? nextRecentAcc
          : prev && prev.hits > 0
            ? Math.max(0, (prev.hits - prev.errors) / prev.hits)
            : batchAcc;
      const accAlpha = Math.min(0.75, 1 - Math.pow(1 - ACC_HIT_ALPHA, Math.min(hitDelta, 35)));
      nextRecentAcc = Math.round((baseAcc * (1 - accAlpha) + batchAcc * accAlpha) * 10000) / 10000;
    }

    nextPerKey[ch] = {
      emaMs: nextEmaMs,
      hits: nextHits,
      errors: nextErrors,
      ...(nextRecentAcc !== undefined ? { recentAcc: nextRecentAcc } : {}),
    };
  }

  const newlyMasteredKeys: string[] = [];
  for (const ch of state.unlocked) {
    if (
      !isKeyMastered(prevPerKey[ch], state.targetWpm) &&
      isKeyMastered(nextPerKey[ch], state.targetWpm)
    ) {
      newlyMasteredKeys.push(ch);
    }
  }

  const allCurrentMastered = state.unlocked.every((ch) =>
    isKeyMastered(nextPerKey[ch], state.targetWpm),
  );
  let newlyUnlockedKey: string | null = null;
  let nextUnlocked = [...state.unlocked];
  if (allCurrentMastered) {
    const candidateUnlock = getNextLockedLetter(nextUnlocked);
    if (candidateUnlock) {
      newlyUnlockedKey = candidateUnlock;
      nextUnlocked = [...nextUnlocked, candidateUnlock];
    }
  }

  return {
    state: {
      unlocked: nextUnlocked,
      perKey: nextPerKey,
      targetWpm: state.targetWpm,
      lessons: state.lessons + 1,
      updatedAt: now,
    },
    prevPerKey,
    newlyMasteredKeys,
    newlyUnlockedKey,
  };
}

// --- Deterministic Seeded Lesson Generator ---

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedDictWords: string[] | null = null;
let cachedBigrams: Map<string, { char: string; weight: number }[]> | null = null;

function getDictWords(): string[] {
  if (cachedDictWords) return cachedDictWords;
  const seen = new Set<string>();
  for (const group of [wordLists.easy, wordLists.medium, wordLists.hard]) {
    for (const raw of group) {
      const clean = raw.trim().toLowerCase();
      if (/^[a-z]{2,10}$/.test(clean)) {
        seen.add(clean);
      }
    }
  }
  cachedDictWords = Array.from(seen).sort();
  return cachedDictWords;
}

function getBigramTable(): Map<string, { char: string; weight: number }[]> {
  if (cachedBigrams) return cachedBigrams;
  const counts = new Map<string, Map<string, number>>();
  const inc = (prev: string, next: string) => {
    let inner = counts.get(prev);
    if (!inner) {
      inner = new Map();
      counts.set(prev, inner);
    }
    inner.set(next, (inner.get(next) ?? 0) + 1);
  };

  for (const w of getDictWords()) {
    inc("^", w[0]!);
    for (let i = 0; i < w.length - 1; i++) {
      inc(w[i]!, w[i + 1]!);
    }
  }

  const table = new Map<string, { char: string; weight: number }[]>();
  for (const [prev, nextMap] of counts.entries()) {
    const list = Array.from(nextMap.entries())
      .map(([char, weight]) => ({ char, weight }))
      .sort((a, b) => b.weight - a.weight || a.char.localeCompare(b.char));
    table.set(prev, list);
  }
  cachedBigrams = table;
  return table;
}

export function getUnlockedCandidateWords(unlocked: readonly string[]): string[] {
  const allowed = new Set(unlocked.map((c) => c.toLowerCase()));
  return getDictWords().filter((w) => {
    for (let i = 0; i < w.length; i++) {
      if (!allowed.has(w[i]!)) return false;
    }
    return true;
  });
}

function pickWeightedChar(
  prevChar: string,
  allowedList: readonly string[],
  allowedSet: ReadonlySet<string>,
  table: Map<string, { char: string; weight: number }[]>,
  rng: () => number,
): string {
  const transitions = (table.get(prevChar) ?? []).filter((t) => allowedSet.has(t.char));
  const prevIsVowel = prevChar !== "^" && VOWELS.has(prevChar);
  const candidates =
    transitions.length > 0
      ? transitions.map((t) => ({
          char: t.char,
          // Gently favor CV / VC alternation so generated pseudo-words are comfortably pronounceable
          weight: t.weight * (VOWELS.has(t.char) !== prevIsVowel ? 1.5 : 0.75),
        }))
      : allowedList.map((char) => ({
          char,
          weight: VOWELS.has(char) !== prevIsVowel ? 2 : 1,
        }));

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  if (total <= 0) {
    return allowedList[Math.floor(rng() * allowedList.length)]!;
  }
  let roll = rng() * total;
  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) return item.char;
  }
  return candidates[candidates.length - 1]!.char;
}

export function generatePseudoWords(
  unlocked: readonly string[],
  count: number,
  seed: number,
  excludeWords: ReadonlySet<string> = new Set(),
  requiredChar?: string,
): string[] {
  const allowedList = Array.from(new Set(unlocked.map((c) => c.toLowerCase()))).filter((c) =>
    LETTER_RANK.has(c),
  );
  if (allowedList.length === 0 || count <= 0) return [];
  const allowedSet = new Set(allowedList);
  const table = getBigramTable();
  const rng = mulberry32(seed ^ 0x9e3779b9);

  const hasVowel = allowedList.some((c) => VOWELS.has(c));
  const out: string[] = [];
  const seen = new Set(excludeWords);
  const maxAttempts = Math.max(200, count * 25);

  for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt++) {
    const len = 3 + Math.floor(rng() * 4); // 3..6 letters
    let word = "";
    let prev = "^";
    for (let i = 0; i < len; i++) {
      let ch = pickWeightedChar(prev, allowedList, allowedSet, table, rng);
      // Prevent triple consecutive identical letters (e.g. "eee")
      if (word.length >= 2 && word[word.length - 1] === ch && word[word.length - 2] === ch) {
        const alt = allowedList.filter((a) => a !== ch);
        if (alt.length > 0) ch = alt[Math.floor(rng() * alt.length)]!;
      }
      word += ch;
      prev = ch;
    }

    if (requiredChar && allowedSet.has(requiredChar) && !word.includes(requiredChar)) {
      const insertPos = Math.floor(rng() * word.length);
      word = word.slice(0, insertPos) + requiredChar + word.slice(insertPos + 1);
    }

    // Ensure pronounceability when vowels are available
    if (hasVowel && !Array.from(word).some((c) => VOWELS.has(c))) {
      continue;
    }

    if (!seen.has(word)) {
      seen.add(word);
      out.push(word);
    }
  }

  return out;
}

export interface GenerateLearnLessonOptions {
  includePunctuation?: boolean | undefined;
  includeCapitals?: boolean | undefined;
  includeNumbers?: boolean | undefined;
}

export interface LearnLessonMeta {
  text: string;
  words: string[];
  focusKey: string;
  focusWordRatio: number;
  usedPseudoWords: boolean;
  unlockedCount: number;
  seed: number;
}

function pickNonRepeatingWord(
  pool: readonly string[],
  recentWindow: readonly string[],
  rng: () => number,
): string {
  const recentSet = new Set(recentWindow);
  const fresh = pool.filter((w) => !recentSet.has(w));
  const source = fresh.length > 0 ? fresh : pool;
  return source[Math.floor(rng() * source.length)]!;
}

export function generateLearnLesson(
  state: LearnState,
  seed: number,
  options?: GenerateLearnLessonOptions,
): LearnLessonMeta {
  const rng = mulberry32(seed);
  const unlocked =
    state.unlocked.length >= INITIAL_UNLOCKED_COUNT
      ? state.unlocked.map((c) => c.toLowerCase())
      : LETTER_ORDER.slice(0, INITIAL_UNLOCKED_COUNT);
  const focusKey = getFocusKey(state).toLowerCase();

  const realCandidates = getUnlockedCandidateWords(unlocked);
  const needsPseudo = realCandidates.length < 40;
  let combinedPool = [...realCandidates];

  if (needsPseudo) {
    const pseudo = generatePseudoWords(
      unlocked,
      Math.max(48 - realCandidates.length, 24),
      seed,
      new Set(realCandidates),
    );
    combinedPool = [...realCandidates, ...pseudo];
  }

  let focusPool = combinedPool.filter((w) => w.includes(focusKey));
  if (focusPool.length < 22) {
    const extraFocusPseudo = generatePseudoWords(
      unlocked,
      28 - focusPool.length,
      seed + 7919,
      new Set(combinedPool),
      focusKey,
    );
    focusPool = [...focusPool, ...extraFocusPseudo];
    combinedPool = [...combinedPool, ...extraFocusPseudo];
  }

  const wordCount =
    LEARN_LESSON_MIN_WORDS +
    Math.floor(rng() * (LEARN_LESSON_MAX_WORDS - LEARN_LESSON_MIN_WORDS + 1));

  // Ensure focusKey appears in >= 45% of slots cleanly (above the 40% minimum)
  const targetFocusSlots = Math.ceil(wordCount * 0.45);
  const slotIsFocus: boolean[] = Array.from({ length: wordCount }, (_, i) => i < targetFocusSlots);
  for (let i = slotIsFocus.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slotIsFocus[i], slotIsFocus[j]] = [slotIsFocus[j]!, slotIsFocus[i]!];
  }

  const baseWords: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const recent = baseWords.slice(-LEARN_REPEAT_WINDOW);
    const pool = slotIsFocus[i] ? focusPool : combinedPool;
    baseWords.push(pickNonRepeatingWord(pool, recent, rng));
  }

  // Gate punctuation / capitals / numbers strictly behind >= 20 unlocked letters
  const allowExtras = unlocked.length >= LEARN_PUNCTUATION_UNLOCK_COUNT;
  const formattedWords = baseWords.map((w, idx) => {
    if (!allowExtras) return w;
    let token = w;
    if (options?.includeNumbers && idx > 0 && idx % 11 === 0) {
      token = String(10 + Math.floor(rng() * 89));
    } else if (options?.includeCapitals && (idx === 0 || (idx > 0 && idx % 7 === 0))) {
      token = token[0]!.toUpperCase() + token.slice(1);
    }
    if (options?.includePunctuation && idx > 2) {
      if (idx === baseWords.length - 1 || idx % 9 === 8) {
        token = `${token}.`;
      } else if (idx % 6 === 4) {
        token = `${token},`;
      }
    }
    return token;
  });

  const focusHits = baseWords.filter((w) => w.includes(focusKey)).length;

  return {
    text: formattedWords.join(" "),
    words: formattedWords,
    focusKey,
    focusWordRatio: baseWords.length > 0 ? focusHits / baseWords.length : 0,
    usedPseudoWords: needsPseudo,
    unlockedCount: unlocked.length,
    seed,
  };
}
