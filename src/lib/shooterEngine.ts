import { ADJACENT_KEYS } from "./shooterWords";

export {
  BOSS_WORDS,
  createSeededRng,
  dateStringToSeed,
  pickBossWord,
  wordPoolFor,
  type WordPoolOptions,
} from "./shooterWords";

export {
  buildShooterRunSummary,
  createInitialShooterState,
  resolveBreachOutcome,
  shooterGameReducer,
  type PauseReason,
  type ShooterGameAction,
  type ShooterGameState,
  type ShooterPhase,
} from "./shooterReducer";

export interface Enemy {
  id: number;
  word: string;
  typed: number;
  x: number;
  y: number;
  speed: number;
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

export interface PowerUpGrantResult {
  slowCharges: number;
  shieldCharges: number;
  earnedSlow: boolean;
  earnedShield: boolean;
}

export const WORDS_PER_LEVEL = 8;
export const MAX_ENEMY_SPEED = 16.5;
export const SLOW_TIME_DURATION_SEC = 5;
export const SLOW_TIME_SPEED_FACTOR = 0.4;
export const MAX_POWERUP_CHARGES = 3;

export function isBossLevel(lvl: number): boolean {
  return lvl > 0 && lvl % 5 === 0;
}

export function computeShooterAccuracy(correctKeystrokes: number, totalKeystrokes: number): number {
  if (totalKeystrokes <= 0) return 100;
  const clampedCorrect = Math.max(0, Math.min(correctKeystrokes, totalKeystrokes));
  return Math.round((clampedCorrect / totalKeystrokes) * 1000) / 10;
}

export function computeShooterHitRate(wordsDestroyed: number, wordsSpawned: number): number {
  if (wordsSpawned <= 0) return 100;
  const clampedDestroyed = Math.max(0, Math.min(wordsDestroyed, wordsSpawned));
  return Math.round((clampedDestroyed / wordsSpawned) * 1000) / 10;
}

export function computeShooterLevel({
  wordsDestroyed,
  accuracy,
  currentLevel,
  bossDefeatedAtLevel,
}: LevelProgressInput): number {
  const safeWords = Math.max(0, Math.floor(wordsDestroyed));
  const safeAcc = Math.max(0, Math.min(100, accuracy));
  const safeCurrent = Math.max(1, Math.floor(currentLevel));
  const effectiveWords = safeWords * (0.7 + (0.3 * safeAcc) / 100);
  const rawLevel = 1 + Math.floor(effectiveWords / WORDS_PER_LEVEL);

  const nextLevel = Math.max(safeCurrent, rawLevel);
  if (isBossLevel(safeCurrent) && bossDefeatedAtLevel < safeCurrent) return safeCurrent;
  if (isBossLevel(safeCurrent) && bossDefeatedAtLevel >= safeCurrent && nextLevel === safeCurrent) {
    return safeCurrent + 1;
  }
  return Math.min(nextLevel, safeCurrent + 1);
}

export function computeDifficultyCurve(level: number, speedMult = 1): DifficultyCurve {
  const safeLevel = Math.max(1, level);
  const safeMult = Math.max(0.5, Math.min(2.5, Number.isFinite(speedMult) ? speedMult : 1));
  const asymptoticGrowth = 1 - Math.exp(-(safeLevel - 1) * 0.16);
  const baseSpeed = Math.min(MAX_ENEMY_SPEED - 1.5, (3.0 + 7.2 * asymptoticGrowth) * safeMult);
  const maxSpeed = Math.min(MAX_ENEMY_SPEED, baseSpeed + 1.4 * safeMult);
  const spawnInterval = Math.max(
    0.68 / Math.sqrt(safeMult),
    (2.25 - 1.25 * asymptoticGrowth) / Math.sqrt(safeMult),
  );
  const maxSimultaneous = Math.min(8, 3 + Math.floor(safeLevel / 2));
  return { baseSpeed, maxSpeed, spawnInterval, maxSimultaneous };
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
  while (words.length < 3) words.push(candidates[words.length % candidates.length] ?? "word");

  const positions = [
    { x: 24, y: 10 },
    { x: 52, y: 22 },
    { x: 76, y: 34 },
  ];
  const curve = computeDifficultyCurve(lvl, speedMult);
  return words.map((word, i) => ({
    id: i + 1,
    word,
    typed: 0,
    x: positions[i]?.x ?? 20 + i * 25,
    y: positions[i]?.y ?? 10 + i * 12,
    speed: Math.min(curve.maxSpeed, curve.baseSpeed + rng() * (curve.maxSpeed - curve.baseSpeed)),
  }));
}

export function stepEnemies(
  enemies: readonly Enemy[],
  dt: number,
  targetId: number | null,
  speedFactor = 1,
) {
  const factor = Math.max(0, speedFactor);
  const moved = enemies.map((e) => ({ ...e, y: e.y + e.speed * factor * dt }));
  const breached = moved.filter((e) => e.y >= 88);
  const surviving = moved.filter((e) => e.y < 88);
  return { surviving, breached, clearedTargetId: breached.some((e) => e.id === targetId) };
}

function inferIntendedExpectedChar(enemies: readonly Enemy[], pressedChar: string): string | null {
  if (enemies.length === 0) return null;
  const sorted = [...enemies].sort((a, b) => b.y - a.y);
  if (sorted.length === 1) return sorted[0]!.word[sorted[0]!.typed] ?? null;
  const neighbors = ADJACENT_KEYS[pressedChar.toLowerCase()] ?? "";
  if (neighbors) {
    for (const enemy of sorted) {
      const nextChar = enemy.word[enemy.typed];
      if (nextChar && neighbors.includes(nextChar.toLowerCase())) return nextChar;
    }
  }
  return null;
}

export function applyKeyToEnemies(
  enemies: readonly Enemy[],
  char: string,
  targetId: number | null,
  currentStreak: number,
): KeyResult {
  let target = targetId != null ? enemies.find((e) => e.id === targetId) : undefined;
  if (!target) {
    target = enemies
      .filter((e) => e.word[e.typed] === char)
      .sort((a, b) => b.y - a.y)
      .at(0);
    if (!target) {
      const expectedChar = inferIntendedExpectedChar(enemies, char);
      return {
        nextEnemies: [...enemies],
        nextTargetId: null,
        targetHit: null,
        wordDestroyed: null,
        wrongKey: true,
        isStrayKey: expectedChar === null,
        scoreGained: 0,
        newStreak: 0,
        expectedChar,
        pressedChar: char,
        multiplier: 1,
      };
    }
  }

  const expected = target.word[target.typed] ?? null;
  const multiplier = target.boss ? 2 : 1;
  if (expected !== char) {
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
  if (typed >= target.word.length) {
    const newStreak = currentStreak + 1;
    const streakBonus = Math.min(5, 1 + Math.floor(newStreak / 5));
    return {
      nextEnemies: enemies.filter((e) => e.id !== target!.id),
      nextTargetId: null,
      targetHit: target,
      wordDestroyed: target,
      wrongKey: false,
      isStrayKey: false,
      scoreGained: target.word.length * 10 * streakBonus * multiplier,
      newStreak,
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
