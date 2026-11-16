import type { Difficulty } from "./sentenceGenerator";
import { scoreWordForWeakTargets } from "./keyStats";
import rawWordLists from "./wordLists.json";

export interface Enemy {
  id: number;
  word: string;
  typed: number; // characters matched so far
  x: number; // percentage 10..90
  y: number; // percentage 0..100
  speed: number; // percentage per second
  boss?: boolean;
}

export interface KeyResult {
  nextEnemies: Enemy[];
  nextTargetId: number | null;
  targetHit: Enemy | null;
  wordDestroyed: Enemy | null;
  wrongKey: boolean;
  isStrayKey: boolean;
  scoreGained: number;
  newStreak: number;
  expectedChar: string | null;
  pressedChar: string;
  multiplier: number;
}

export interface WordPoolOptions {
  missedWords?: readonly string[] | undefined;
  weakKeys?: readonly string[] | undefined;
  rng?: (() => number) | undefined;
}

export interface DifficultyCurve {
  baseSpeed: number;
  maxSpeed: number;
  spawnInterval: number;
  maxSimultaneous: number;
}

export interface LevelProgressInput {
  wordsDestroyed: number;
  accuracy: number;
  currentLevel: number;
  bossDefeatedAtLevel: number;
}

export const WORDS_PER_LEVEL = 8;
export const MAX_ENEMY_SPEED = 16.5;
export const SLOW_TIME_DURATION_SEC = 5;
export const SLOW_TIME_SPEED_FACTOR = 0.4;
export const MAX_POWERUP_CHARGES = 3;

const BOSS_WORDS = [
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

const ADJACENT_KEYS: Record<string, string> = {
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

export function isBossLevel(lvl: number): boolean {
  return lvl > 0 && lvl % 5 === 0;
}

/**
 * Pure per-character accuracy: correct keystrokes / total keystrokes (%).
 */
export function computeShooterAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100;
  const clampedCorrect = Math.max(0, Math.min(correctKeystrokes, totalKeystrokes));
  return Math.round((clampedCorrect / totalKeystrokes) * 1000) / 10;
}

/**
 * Pure word hit rate: words destroyed / words spawned (%).
 */
export function computeShooterHitRate(wordsDestroyed: number, wordsSpawned: number): number {
  if (wordsSpawned <= 0) return 100;
  const clampedDestroyed = Math.max(0, Math.min(wordsDestroyed, wordsSpawned));
  return Math.round((clampedDestroyed / wordsSpawned) * 1000) / 10;
}

/**
 * Level progression driven by words destroyed + accuracy, with boss-level gating.
 * Never decreases below `currentLevel`. On boss levels (5, 10, 15...), the boss
 * must be defeated (`bossDefeatedAtLevel >= currentLevel`) before advancing past it.
 */
export function computeShooterLevel({
  wordsDestroyed,
  accuracy,
  currentLevel,
  bossDefeatedAtLevel,
}: LevelProgressInput): number {
  const safeWords = Math.max(0, Math.floor(wordsDestroyed));
  const safeAcc = Math.max(0, Math.min(100, accuracy));
  const safeCurrent = Math.max(1, Math.floor(currentLevel));
  const accuracyFactor = 0.7 + (0.3 * safeAcc) / 100;
  const effectiveWords = safeWords * accuracyFactor;
  const rawLevel = 1 + Math.floor(effectiveWords / WORDS_PER_LEVEL);

  const nextLevel = Math.max(safeCurrent, rawLevel);
  if (isBossLevel(safeCurrent) && bossDefeatedAtLevel < safeCurrent) {
    return safeCurrent;
  }
  if (isBossLevel(safeCurrent) && bossDefeatedAtLevel >= safeCurrent && nextLevel === safeCurrent) {
    return safeCurrent + 1;
  }
  return Math.min(nextLevel, safeCurrent + 1);
}

/**
 * Smooth asymptotic difficulty curve with capped fall speed and bounded spawn rate.
 */
export function computeDifficultyCurve(level: number, speedMult = 1): DifficultyCurve {
  const safeLevel = Math.max(1, level);
  const safeMult = Math.max(0.5, Math.min(2.5, Number.isFinite(speedMult) ? speedMult : 1));
  const asymptoticGrowth = 1 - Math.exp(-(safeLevel - 1) * 0.16);
  const rawBase = (3.0 + 7.2 * asymptoticGrowth) * safeMult;
  const baseSpeed = Math.min(MAX_ENEMY_SPEED - 1.5, rawBase);
  const maxSpeed = Math.min(MAX_ENEMY_SPEED, baseSpeed + 1.4 * safeMult);
  const spawnInterval = Math.max(
    0.68 / Math.sqrt(safeMult),
    (2.25 - 1.25 * asymptoticGrowth) / Math.sqrt(safeMult),
  );
  const maxSimultaneous = Math.min(8, 3 + Math.floor(safeLevel / 2));

  return {
    baseSpeed,
    maxSpeed,
    spawnInterval,
    maxSimultaneous,
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
  if (difficulty === "easy") {
    return word.length >= 2 && word.length <= 6;
  }
  if (word.length < 4 && FUNCTION_WORDS_UNDER_4.has(word)) {
    return false;
  }
  if (difficulty === "medium") {
    return (
      word.length >= 3 &&
      word.length <= 8 &&
      (word.length >= 4 || !FUNCTION_WORDS_UNDER_4.has(word))
    );
  }
  return word.length >= 5 && word.length <= 13;
}

/**
 * Build a curated shooter word pool by difficulty, free of template filler,
 * excluding short function words on Medium/Hard, and weighted toward missed words & weak keys.
 */
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

  const sourceList =
    difficulty === "easy"
      ? WORD_LISTS.easy
      : difficulty === "medium"
        ? WORD_LISTS.medium
        : WORD_LISTS.hard;

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

  // Sort weak-key words by relevance score, then shuffle within chunks so variety stays fresh
  weakFiltered.sort(
    (a, b) => scoreWordForWeakTargets(b, weakKeys) - scoreWordForWeakTargets(a, weakKeys),
  );
  const topWeak = shuffleWithRng(weakFiltered.slice(0, 80), rng);
  const restWeak = shuffleWithRng(weakFiltered.slice(80), rng);
  const shuffledGeneral = shuffleWithRng(general, rng);
  const shuffledMissed = shuffleWithRng(Array.from(missedSet), rng);

  // Interleave prioritized missed words & weak-key matches early while preserving deep pool variety
  const merged = Array.from(
    new Set([...shuffledMissed, ...topWeak, ...restWeak, ...shuffledGeneral]),
  );

  return merged.length > 0
    ? merged
    : ["type", "laser", "swift", "focus", "shield", "velocity", "planet"];
}

export function pickBossWord(
  difficulty: Difficulty,
  activeEnemies: readonly Enemy[],
  pool: readonly string[],
  rng: () => number = Math.random,
): string {
  const usedWords = new Set(activeEnemies.map((e) => e.word));
  const usedFirst = new Set(activeEnemies.map((e) => e.word[0]));
  const minLen = difficulty === "easy" ? 7 : 8;

  const poolCandidates = pool.filter(
    (w) => w.length >= minLen && !usedWords.has(w) && !usedFirst.has(w[0]),
  );
  if (poolCandidates.length > 0) {
    const idx = Math.floor(rng() * Math.min(12, poolCandidates.length));
    return poolCandidates[idx]!;
  }

  const fallbackCandidates = BOSS_WORDS.filter((w) => !usedWords.has(w) && !usedFirst.has(w[0]));
  if (fallbackCandidates.length > 0) {
    return fallbackCandidates[Math.floor(rng() * fallbackCandidates.length)]!;
  }
  return BOSS_WORDS[Math.floor(rng() * BOSS_WORDS.length)] ?? "corrupted";
}

export function createInitialEnemies(
  pool: readonly string[],
  speedMult: number,
  lvl: number,
  rng: () => number = Math.random,
): Enemy[] {
  const words: string[] = [];
  const usedLetters = new Set<string>();
  const candidates = pool.length
    ? pool
    : ["type", "swift", "laser", "react", "speed", "focus", "ship"];

  for (const w of candidates) {
    if (words.length >= 3) break;
    const first = w[0]?.toLowerCase() ?? "";
    if (!usedLetters.has(first)) {
      usedLetters.add(first);
      words.push(w);
    }
  }

  while (words.length < 3) {
    words.push(candidates[words.length % candidates.length] ?? "word");
  }

  const positions = [
    { x: 24, y: 10 },
    { x: 52, y: 22 },
    { x: 76, y: 34 },
  ];

  const curve = computeDifficultyCurve(lvl, speedMult);
  return words.map((word, i) => {
    const speed = Math.min(
      curve.maxSpeed,
      curve.baseSpeed + rng() * (curve.maxSpeed - curve.baseSpeed),
    );
    return {
      id: i + 1,
      word,
      typed: 0,
      x: positions[i]?.x ?? 20 + i * 25,
      y: positions[i]?.y ?? 10 + i * 12,
      speed,
    };
  });
}

/** Pure step of enemy positions and breach detection. */
export function stepEnemies(
  enemies: readonly Enemy[],
  dt: number,
  targetId: number | null,
  speedFactor = 1,
): {
  surviving: Enemy[];
  breached: Enemy[];
  clearedTargetId: boolean;
} {
  const factor = Math.max(0, speedFactor);
  const moved = enemies.map((e) => ({ ...e, y: e.y + e.speed * factor * dt }));
  const breached = moved.filter((e) => e.y >= 88);
  const surviving = moved.filter((e) => e.y < 88);
  const clearedTargetId = breached.some((e) => e.id === targetId);

  return {
    surviving,
    breached,
    clearedTargetId,
  };
}

function inferIntendedExpectedChar(enemies: readonly Enemy[], pressedChar: string): string | null {
  if (enemies.length === 0) return null;
  const sortedByLowest = [...enemies].sort((a, b) => b.y - a.y);

  if (sortedByLowest.length === 1) {
    const only = sortedByLowest[0]!;
    return only.word[only.typed] ?? null;
  }

  const neighbors = ADJACENT_KEYS[pressedChar.toLowerCase()] ?? "";
  if (neighbors) {
    for (const enemy of sortedByLowest) {
      const nextChar = enemy.word[enemy.typed];
      if (nextChar && neighbors.includes(nextChar.toLowerCase())) {
        return nextChar;
      }
    }
  }

  return null;
}

/** Pure key resolution for falling enemies, with adjacent/single-target miss attribution. */
export function applyKeyToEnemies(
  enemies: readonly Enemy[],
  char: string,
  targetId: number | null,
  currentStreak: number,
): KeyResult {
  const current = targetId != null ? enemies.find((e) => e.id === targetId) : undefined;
  let target = current;

  if (!target) {
    // Lock onto the lowest enemy whose NEXT expected char matches.
    target = enemies
      .filter((e) => e.word[e.typed] === char)
      .sort((a, b) => b.y - a.y)
      .at(0);

    if (!target) {
      const inferredExpected = inferIntendedExpectedChar(enemies, char);
      return {
        nextEnemies: [...enemies],
        nextTargetId: null,
        targetHit: null,
        wordDestroyed: null,
        wrongKey: true,
        isStrayKey: inferredExpected === null,
        scoreGained: 0,
        newStreak: 0,
        expectedChar: inferredExpected,
        pressedChar: char,
        multiplier: 1,
      };
    }
  }

  const expected = target.word[target.typed] ?? null;
  const multiplier = target.boss ? 2 : 1;

  if (target.word[target.typed] !== char) {
    return {
      nextEnemies: [...enemies],
      nextTargetId: target.id,
      targetHit: null,
      wordDestroyed: null,
      wrongKey: true,
      isStrayKey: false,
      scoreGained: 0,
      newStreak: 0,
      expectedChar: expected,
      pressedChar: char,
      multiplier,
    };
  }

  const typed = target.typed + 1;
  const isDestroyed = typed >= target.word.length;

  if (isDestroyed) {
    const nextStreak = currentStreak + 1;
    const streakBonus = Math.min(5, 1 + Math.floor(nextStreak / 5));
    const scoreGained = target.word.length * 10 * streakBonus * multiplier;

    return {
      nextEnemies: enemies.filter((e) => e.id !== target!.id),
      nextTargetId: null,
      targetHit: target,
      wordDestroyed: target,
      wrongKey: false,
      isStrayKey: false,
      scoreGained,
      newStreak: nextStreak,
      expectedChar: expected,
      pressedChar: char,
      multiplier,
    };
  }

  return {
    nextEnemies: enemies.map((e) => (e.id === target!.id ? { ...e, typed } : e)),
    nextTargetId: target.id,
    targetHit: target,
    wordDestroyed: null,
    wrongKey: false,
    isStrayKey: false,
    scoreGained: 0,
    newStreak: currentStreak,
    expectedChar: expected,
    pressedChar: char,
    multiplier,
  };
}

export const applyKey = applyKeyToEnemies;

export interface PowerUpGrantResult {
  slowCharges: number;
  shieldCharges: number;
  earnedSlow: boolean;
  earnedShield: boolean;
}

/**
 * Award streak power-ups:
 * - Every 5-word streak earns Slow-Time (max 3).
 * - Every 10-word streak earns Shield (max 3).
 */
export function awardPowerUpsForStreak(
  newStreak: number,
  currentSlow: number,
  currentShield: number,
): PowerUpGrantResult {
  let slowCharges = currentSlow;
  let shieldCharges = currentShield;
  let earnedSlow = false;
  let earnedShield = false;

  if (newStreak > 0 && newStreak % 10 === 0 && shieldCharges < MAX_POWERUP_CHARGES) {
    shieldCharges += 1;
    earnedShield = true;
  } else if (newStreak > 0 && newStreak % 5 === 0 && slowCharges < MAX_POWERUP_CHARGES) {
    slowCharges += 1;
    earnedSlow = true;
  }

  return { slowCharges, shieldCharges, earnedSlow, earnedShield };
}
