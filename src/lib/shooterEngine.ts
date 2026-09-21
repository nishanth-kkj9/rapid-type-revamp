import type { Difficulty } from "./sentenceGenerator";
import { generatePassage } from "./sentenceGenerator";

export interface Enemy {
  id: number;
  word: string;
  typed: number; // characters matched so far
  x: number; // percentage 10..90
  y: number; // percentage 0..100
  speed: number; // percentage per second
}

export interface KeyResult {
  nextEnemies: Enemy[];
  nextTargetId: number | null;
  targetHit: Enemy | null;
  wordDestroyed: Enemy | null;
  wrongKey: boolean;
  scoreGained: number;
  newStreak: number;
}

export function wordPoolFor(difficulty: Difficulty): string[] {
  const passage = generatePassage(difficulty, 900);
  const words = passage
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return words.length
    ? Array.from(new Set(words))
    : ["type", "fast", "word", "laser", "ship", "speed", "focus"];
}

export function createInitialEnemies(pool: string[], speedMult: number, lvl: number): Enemy[] {
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
    { x: 25, y: 12 },
    { x: 55, y: 26 },
    { x: 78, y: 40 },
  ];

  return words.map((word, i) => {
    const baseSpeed = (3.0 + lvl * 0.6 + Math.random() * 0.8) * speedMult;
    return {
      id: i + 1,
      word,
      typed: 0,
      x: positions[i]?.x ?? 20 + i * 25,
      y: positions[i]?.y ?? 12 + i * 14,
      speed: baseSpeed,
    };
  });
}

/** Pure step of enemy positions and breach detection. */
export function stepEnemies(
  enemies: readonly Enemy[],
  dt: number,
  targetId: number | null,
): {
  surviving: Enemy[];
  breached: Enemy[];
  clearedTargetId: boolean;
} {
  const moved = enemies.map((e) => ({ ...e, y: e.y + e.speed * dt }));
  const breached = moved.filter((e) => e.y >= 88);
  const surviving = moved.filter((e) => e.y < 88);
  const clearedTargetId = breached.some((e) => e.id === targetId);

  return {
    surviving,
    breached,
    clearedTargetId,
  };
}

/** Pure key resolution for falling enemies. */
export function applyKeyToEnemies(
  enemies: readonly Enemy[],
  char: string,
  targetId: number | null,
  currentStreak: number,
): KeyResult {
  const current = targetId != null ? enemies.find((e) => e.id === targetId) : undefined;
  let target = current;

  if (!target) {
    // Lock onto the lowest enemy that starts with this char
    target = enemies
      .filter((e) => e.word[0] === char)
      .sort((a, b) => b.y - a.y)
      .at(0);

    if (!target) {
      return {
        nextEnemies: [...enemies],
        nextTargetId: null,
        targetHit: null,
        wordDestroyed: null,
        wrongKey: true,
        scoreGained: 0,
        newStreak: 0,
      };
    }
  }

  if (target.word[target.typed] !== char) {
    return {
      nextEnemies: [...enemies],
      nextTargetId: target.id,
      targetHit: null,
      wordDestroyed: null,
      wrongKey: true,
      scoreGained: 0,
      newStreak: 0,
    };
  }

  const typed = target.typed + 1;
  const isDestroyed = typed >= target.word.length;

  if (isDestroyed) {
    const nextStreak = currentStreak + 1;
    const streakBonus = Math.min(5, 1 + Math.floor(nextStreak / 5));
    const scoreGained = target.word.length * 10 * streakBonus;

    return {
      nextEnemies: enemies.filter((e) => e.id !== target!.id),
      nextTargetId: null,
      targetHit: target,
      wordDestroyed: target,
      wrongKey: false,
      scoreGained,
      newStreak: nextStreak,
    };
  }

  return {
    nextEnemies: enemies.map((e) => (e.id === target!.id ? { ...e, typed } : e)),
    nextTargetId: target.id,
    targetHit: target,
    wordDestroyed: null,
    wrongKey: false,
    scoreGained: 0,
    newStreak: currentStreak,
  };
}
