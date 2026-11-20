import type { ShooterRunSummary } from "./typingStats";
import {
  awardPowerUpsForStreak,
  computeShooterAccuracy,
  computeShooterHitRate,
  computeShooterLevel,
} from "./shooterEngine";

export type ShooterPhase = "idle" | "playing" | "paused" | "resuming" | "over";
export type PauseReason = "manual" | "hidden" | "blur" | null;

export interface ShooterGameState {
  phase: ShooterPhase;
  pauseReason: PauseReason;
  resumeCountdown: number | null;
  levelBanner: number | null;
  score: number;
  lives: number;
  level: number;
  streak: number;
  maxStreak: number;
  best: number;
  isNewRecord: boolean;
  hits: number;
  wordsSpawned: number;
  correctKeys: number;
  wrongKeys: number;
  strayKeys: number;
  bossesDefeated: number;
  bossDefeatedAtLevel: number;
  slowCharges: number;
  shieldCharges: number;
  slowTimeActive: boolean;
  hasDangerEnemy: boolean;
  targetWord: string | null;
  durationSecDisplay: number;
  practiceMode: boolean;
}

export type ShooterGameAction =
  | { type: "SYNC_BEST"; best: number }
  | {
      type: "START";
      initialWordsSpawned: number;
      startingLives: number;
      practiceMode: boolean;
      targetWord: string | null;
    }
  | { type: "PAUSE"; reason: PauseReason }
  | { type: "BEGIN_RESUME" }
  | { type: "RESUME_TICK" }
  | { type: "CLEAR_LEVEL_BANNER" }
  | { type: "WORD_SPAWNED"; count?: number }
  | { type: "KEY_WRONG"; isStrayKey: boolean; targetWord: string | null }
  | {
      type: "KEY_HIT";
      wordDestroyed: boolean;
      isBoss?: boolean;
      newStreak: number;
      scoreGained: number;
      targetWord: string | null;
    }
  | { type: "ACTIVATE_SLOW_TIME" }
  | { type: "EXPIRE_SLOW_TIME" }
  | { type: "BREACH"; breachedCount: number; practiceMode: boolean; targetWord?: string | null }
  | { type: "SET_DANGER"; hasDanger: boolean }
  | { type: "SET_TARGET_WORD"; targetWord: string | null }
  | { type: "GAME_OVER"; durationSec: number };

export function createInitialShooterState(
  initialBest: number,
  startingLives: number,
  practiceMode: boolean,
): ShooterGameState {
  return {
    phase: "idle",
    pauseReason: null,
    resumeCountdown: null,
    levelBanner: null,
    score: 0,
    lives: practiceMode ? 0 : startingLives,
    level: 1,
    streak: 0,
    maxStreak: 0,
    best: initialBest,
    isNewRecord: false,
    hits: 0,
    wordsSpawned: 0,
    correctKeys: 0,
    wrongKeys: 0,
    strayKeys: 0,
    bossesDefeated: 0,
    bossDefeatedAtLevel: 0,
    slowCharges: 0,
    shieldCharges: 0,
    slowTimeActive: false,
    hasDangerEnemy: false,
    targetWord: null,
    durationSecDisplay: 1,
    practiceMode,
  };
}

export function resolveBreachOutcome(
  breachedCount: number,
  shieldCharges: number,
  practiceMode: boolean,
) {
  if (practiceMode || breachedCount <= 0) {
    return { remainingShields: shieldCharges, shieldsUsed: 0, damage: 0 };
  }
  const shieldsUsed = Math.min(shieldCharges, breachedCount);
  return {
    remainingShields: shieldCharges - shieldsUsed,
    shieldsUsed,
    damage: breachedCount - shieldsUsed,
  };
}

export function buildShooterRunSummary(
  s: ShooterGameState,
  opts: {
    durationSec: number;
    activeTypingSec: number;
    charsDestroyed: number;
    difficulty: string;
    practiceMode: boolean;
    dailyChallengeDate?: string | undefined;
    samples?: number[] | undefined;
  },
): ShooterRunSummary {
  return {
    score: s.score,
    wordsDestroyed: s.hits,
    wordsSpawned: s.wordsSpawned,
    charsDestroyed: opts.charsDestroyed > 0 ? opts.charsDestroyed : s.hits * 5,
    accuracy: computeShooterAccuracy(s.correctKeys, s.correctKeys + s.wrongKeys),
    hitRate: computeShooterHitRate(s.hits, s.wordsSpawned),
    maxStreak: s.maxStreak,
    durationSec: opts.durationSec,
    activeDurationSec: Math.min(
      opts.durationSec,
      Math.max(0, Math.round(opts.activeTypingSec * 10) / 10),
    ),
    difficulty: opts.difficulty,
    misses: Math.max(0, s.wordsSpawned - s.hits),
    wrongKeys: s.wrongKeys,
    strayKeys: s.strayKeys,
    bossesDefeated: s.bossesDefeated,
    practiceMode: opts.practiceMode,
    dailyChallengeDate: opts.dailyChallengeDate,
    level: s.level,
    samples: opts.samples && opts.samples.length > 1 ? [...opts.samples] : undefined,
  };
}

export function shooterGameReducer(
  state: ShooterGameState,
  action: ShooterGameAction,
): ShooterGameState {
  switch (action.type) {
    case "SYNC_BEST":
      return state.best === action.best ? state : { ...state, best: action.best };
    case "START":
      return {
        ...state,
        phase: "playing",
        pauseReason: null,
        resumeCountdown: null,
        levelBanner: null,
        score: 0,
        lives: action.practiceMode ? 0 : action.startingLives,
        level: 1,
        streak: 0,
        maxStreak: 0,
        isNewRecord: false,
        hits: 0,
        wordsSpawned: action.initialWordsSpawned,
        correctKeys: 0,
        wrongKeys: 0,
        strayKeys: 0,
        bossesDefeated: 0,
        bossDefeatedAtLevel: 0,
        slowCharges: 0,
        shieldCharges: 0,
        slowTimeActive: false,
        hasDangerEnemy: false,
        targetWord: action.targetWord,
        durationSecDisplay: 1,
        practiceMode: action.practiceMode,
      };
    case "PAUSE":
      if (state.phase !== "playing" && state.phase !== "resuming") return state;
      return { ...state, phase: "paused", pauseReason: action.reason, resumeCountdown: null };
    case "BEGIN_RESUME":
      if (state.phase !== "paused") return state;
      return { ...state, phase: "resuming", pauseReason: null, resumeCountdown: 3 };
    case "RESUME_TICK":
      if (state.phase !== "resuming" || state.resumeCountdown === null) return state;
      return state.resumeCountdown <= 1
        ? { ...state, phase: "playing", resumeCountdown: null }
        : { ...state, resumeCountdown: state.resumeCountdown - 1 };
    case "CLEAR_LEVEL_BANNER":
      return state.levelBanner === null ? state : { ...state, levelBanner: null };
    case "WORD_SPAWNED":
      return { ...state, wordsSpawned: state.wordsSpawned + (action.count ?? 1) };
    case "KEY_WRONG":
      return {
        ...state,
        streak: 0,
        wrongKeys: state.wrongKeys + 1,
        strayKeys: state.strayKeys + (action.isStrayKey ? 1 : 0),
        targetWord: action.targetWord,
      };
    case "KEY_HIT": {
      const correctKeys = state.correctKeys + 1;
      if (!action.wordDestroyed) {
        return state.targetWord === action.targetWord && state.correctKeys === correctKeys
          ? state
          : { ...state, correctKeys, targetWord: action.targetWord };
      }
      const hits = state.hits + 1;
      const streak = action.newStreak;
      const bossDefeatedAtLevel = action.isBoss
        ? Math.max(state.bossDefeatedAtLevel, state.level)
        : state.bossDefeatedAtLevel;
      const powerGrant = awardPowerUpsForStreak(streak, state.slowCharges, state.shieldCharges);
      const nextLevel = computeShooterLevel({
        wordsDestroyed: hits,
        accuracy: computeShooterAccuracy(correctKeys, correctKeys + state.wrongKeys),
        currentLevel: state.level,
        bossDefeatedAtLevel,
      });
      return {
        ...state,
        correctKeys,
        hits,
        streak,
        maxStreak: Math.max(state.maxStreak, streak),
        bossesDefeated: state.bossesDefeated + (action.isBoss ? 1 : 0),
        bossDefeatedAtLevel,
        slowCharges: powerGrant.slowCharges,
        shieldCharges: powerGrant.shieldCharges,
        score: state.score + action.scoreGained,
        level: nextLevel,
        levelBanner: nextLevel > state.level ? nextLevel : state.levelBanner,
        targetWord: action.targetWord,
      };
    }
    case "ACTIVATE_SLOW_TIME":
      if (state.phase !== "playing" || state.slowCharges <= 0) return state;
      return { ...state, slowCharges: state.slowCharges - 1, slowTimeActive: true };
    case "EXPIRE_SLOW_TIME":
      return state.slowTimeActive ? { ...state, slowTimeActive: false } : state;
    case "BREACH": {
      if (action.breachedCount <= 0) return state;
      const targetWord = action.targetWord !== undefined ? action.targetWord : state.targetWord;
      if (action.practiceMode) return { ...state, streak: 0, targetWord };
      const { remainingShields, damage } = resolveBreachOutcome(
        action.breachedCount,
        state.shieldCharges,
        false,
      );
      return damage > 0
        ? {
            ...state,
            shieldCharges: remainingShields,
            streak: 0,
            lives: Math.max(0, state.lives - damage),
            targetWord,
          }
        : { ...state, shieldCharges: remainingShields, targetWord };
    }
    case "SET_DANGER":
      return state.hasDangerEnemy === action.hasDanger
        ? state
        : { ...state, hasDangerEnemy: action.hasDanger };
    case "SET_TARGET_WORD":
      return state.targetWord === action.targetWord
        ? state
        : { ...state, targetWord: action.targetWord };
    case "GAME_OVER": {
      const beatBest = !state.practiceMode && state.score > state.best;
      return {
        ...state,
        phase: "over",
        pauseReason: null,
        resumeCountdown: null,
        durationSecDisplay: Math.max(1, Math.round(action.durationSec)),
        isNewRecord: beatBest ? true : state.isNewRecord,
        best: beatBest ? state.score : state.best,
      };
    }
  }
}
