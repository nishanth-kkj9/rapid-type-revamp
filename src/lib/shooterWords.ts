import type { Difficulty } from "./sentenceGenerator";
import { scoreWordForWeakTargets } from "./keyStats";
import rawWordLists from "./wordLists.json";

export interface WordPoolOptions {
  missedWords?: readonly string[] | undefined;
  weakKeys?: readonly string[] | undefined;
  rng?: (() => number) | undefined;
}

export const BOSS_WORDS = [
  "algorithm",
  "architect",
  "atmosphere",
  "capacitor",
  "chronicle",
  "corrupted",
  "cybernetic",
  "discovery",
  "encryption",
  "hyperdrive",
  "interface",
  "keyboard",
  "labyrinth",
  "momentum",
  "navigator",
  "overdrive",
  "precision",
  "prototype",
  "starlight",
  "telemetry",
  "telescope",
  "trajectory",
  "velocity",
] as const;

const FUNCTION_WORDS_UNDER_4 = new Set([
  "a",
  "all",
  "am",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "did",
  "do",
  "few",
  "for",
  "get",
  "go",
  "got",
  "had",
  "has",
  "he",
  "her",
  "him",
  "his",
  "how",
  "if",
  "in",
  "is",
  "it",
  "its",
  "let",
  "may",
  "me",
  "my",
  "no",
  "nor",
  "not",
  "now",
  "of",
  "off",
  "on",
  "one",
  "or",
  "our",
  "out",
  "own",
  "per",
  "put",
  "set",
  "she",
  "so",
  "the",
  "to",
  "too",
  "two",
  "up",
  "us",
  "via",
  "was",
  "we",
  "who",
  "why",
  "yes",
  "yet",
  "you",
]);

export const ADJACENT_KEYS: Record<string, string> = {
  q: "wa",
  w: "qeas",
  e: "wrsd",
  r: "etdf",
  t: "ryfg",
  y: "tugh",
  u: "yihj",
  i: "uojk",
  o: "ipkl",
  p: "ol",
  a: "qwsz",
  s: "weadzx",
  d: "ersfcx",
  f: "rtdgcv",
  g: "tyfhvb",
  h: "yugjbn",
  j: "uihkmn",
  k: "iojlm",
  l: "opk",
  z: "asx",
  x: "zsdc",
  c: "xdfv",
  v: "cfgb",
  b: "vghn",
  n: "bhjm",
  m: "njk",
};

interface WordListsJson {
  easy: string[];
  medium: string[];
  hard: string[];
}

const WORD_LISTS = rawWordLists as WordListsJson;

/** Deterministic integer seed from a date string like "2026-11-15". */
export function dateStringToSeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG (Mulberry32) in [0, 1). */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

function isValidShooterWord(word: string, difficulty: Difficulty): boolean {
  if (!/^[a-z]{2,16}$/.test(word)) return false;
  if (difficulty === "easy") return word.length >= 2 && word.length <= 6;
  if (word.length < 4 && FUNCTION_WORDS_UNDER_4.has(word)) return false;
  if (difficulty === "medium") {
    return word.length >= 3 && word.length <= 8;
  }
  return word.length >= 5 && word.length <= 13;
}

/** Curated shooter word pool weighted toward missed words & weak keys. */
export function wordPoolFor(
  difficulty: Difficulty,
  extraOrOptions: readonly string[] | WordPoolOptions = [],
): string[] {
  const opts: WordPoolOptions = Array.isArray(extraOrOptions)
    ? { missedWords: extraOrOptions }
    : (extraOrOptions as WordPoolOptions);

  const rng = opts.rng ?? Math.random;
  const weakKeys = (opts.weakKeys ?? [])
    .map((k) => k.toLowerCase())
    .filter((k) => /^[a-z]$/.test(k));
  const missedWords = (opts.missedWords ?? [])
    .map((w) => w.toLowerCase().replace(/[^a-z]/g, ""))
    .filter((w) => isValidShooterWord(w, difficulty));

  const sourceList = WORD_LISTS[difficulty];
  const curated = Array.from(
    new Set(
      sourceList
        .map((w) => w.toLowerCase().trim())
        .filter((w) => isValidShooterWord(w, difficulty)),
    ),
  );

  const missedSet = new Set(missedWords);
  const weakFiltered: string[] = [];
  const general: string[] = [];

  for (const w of curated) {
    if (missedSet.has(w)) continue;
    if (weakKeys.length > 0 && scoreWordForWeakTargets(w, weakKeys) > 0) {
      weakFiltered.push(w);
    } else {
      general.push(w);
    }
  }

  weakFiltered.sort(
    (a, b) => scoreWordForWeakTargets(b, weakKeys) - scoreWordForWeakTargets(a, weakKeys),
  );
  const topWeak = shuffleWithRng(weakFiltered.slice(0, 80), rng);
  const restWeak = shuffleWithRng(weakFiltered.slice(80), rng);
  const shuffledGeneral = shuffleWithRng(general, rng);
  const shuffledMissed = shuffleWithRng(Array.from(missedSet), rng);
  const merged = Array.from(
    new Set([...shuffledMissed, ...topWeak, ...restWeak, ...shuffledGeneral]),
  );

  return merged.length > 0
    ? merged
    : ["type", "laser", "swift", "focus", "shield", "velocity", "planet"];
}

export function pickBossWord(
  difficulty: Difficulty,
  activeWords: readonly { word: string }[],
  pool: readonly string[],
  rng: () => number = Math.random,
): string {
  const usedWords = new Set(activeWords.map((e) => e.word));
  const usedFirst = new Set(activeWords.map((e) => e.word[0]));
  const minLen = difficulty === "easy" ? 7 : 8;

  const poolCandidates = pool.filter(
    (w) => w.length >= minLen && !usedWords.has(w) && !usedFirst.has(w[0]),
  );
  if (poolCandidates.length > 0) {
    return poolCandidates[Math.floor(rng() * Math.min(12, poolCandidates.length))]!;
  }

  const fallback = BOSS_WORDS.filter((w) => !usedWords.has(w) && !usedFirst.has(w[0]));
  if (fallback.length > 0) {
    return fallback[Math.floor(rng() * fallback.length)]!;
  }
  return BOSS_WORDS[Math.floor(rng() * BOSS_WORDS.length)] ?? "corrupted";
}
