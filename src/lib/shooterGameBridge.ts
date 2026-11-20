import { getLocalDateString } from "./daily";
import type { ShooterSettings } from "./shooterSettings";
import {
  buildShooterRunSummary,
  createInitialEnemies,
  createSeededRng,
  dateStringToSeed,
  resolveBreachOutcome,
  shooterGameReducer,
  wordPoolFor,
  type Enemy,
  type ShooterGameState,
} from "./shooterEngine";
import {
  applyKeyStepToSim,
  findTargetWord,
  makeInitialSim,
  pushDestroyVisuals,
  pushShieldSavedVisuals,
  type MutableSimState,
} from "./shooterSimVisuals";

export interface ShooterRunTracker {
  dailyDate: string | undefined;
  charsDestroyed: number;
  samples: number[];
  activeTypingSec: number;
  lastKeyMs: number | null;
  activeChar: string | null;
  runEnded: boolean;
}

export function createShooterRunTracker(dailyDate: string | undefined): ShooterRunTracker {
  return {
    dailyDate,
    charsDestroyed: 0,
    samples: [0],
    activeTypingSec: 0,
    lastKeyMs: null,
    activeChar: null,
    runEnded: false,
  };
}

export function initShooterSession(
  settings: ShooterSettings,
  missedWords: readonly string[],
  weakKeys: readonly string[],
) {
  const today = getLocalDateString();
  const rng = settings.dailyChallenge ? createSeededRng(dateStringToSeed(today)) : Math.random;
  const pool = wordPoolFor(settings.difficulty, {
    missedWords: settings.dailyChallenge ? [] : missedWords,
    weakKeys: settings.dailyChallenge ? [] : weakKeys,
    rng,
  });
  const initial = createInitialEnemies(pool, settings.speedMultiplier, 1, rng);
  const sim = makeInitialSim(initial);
  const dailyDate = settings.dailyChallenge ? today : undefined;
  return {
    rng,
    pool,
    sim,
    initialCount: initial.length,
    targetWord: findTargetWord(sim),
    tracker: createShooterRunTracker(dailyDate),
    announcement: settings.dailyChallenge
      ? `Daily Challenge started for ${today}. Type the falling words.`
      : "Game started. Type the falling words.",
  };
}

export function getActiveTargetChar(sim: MutableSimState, phase: ShooterGameState["phase"]) {
  if (phase !== "playing") return null;
  const enemy = sim.enemies.find((e) => e.id === sim.targetId);
  return enemy && enemy.typed < enemy.word.length ? (enemy.word[enemy.typed] ?? null) : null;
}

export function processShooterKeyPress(opts: {
  sim: MutableSimState;
  prev: ShooterGameState;
  tracker: ShooterRunTracker;
  char: string;
  nowMs: number;
  reducedMotion: boolean;
}) {
  const { sim, prev, tracker, char, nowMs, reducedMotion } = opts;
  tracker.activeTypingSec +=
    tracker.lastKeyMs !== null
      ? Math.min(2.5, Math.max(0, (nowMs - tracker.lastKeyMs) / 1000))
      : 0.25;
  tracker.lastKeyMs = nowMs;

  const res = applyKeyStepToSim(sim, char, prev.streak);
  const targetWord = findTargetWord(sim);
  if (res.wrongKey) {
    const action = {
      type: "KEY_WRONG" as const,
      isStrayKey: res.isStrayKey,
      targetWord,
    };
    return {
      action,
      next: shooterGameReducer(prev, action),
      wrongExpectedChar: !res.isStrayKey ? (res.expectedChar ?? null) : null,
      playLaser: false,
      playExplosion: false,
      announcement: null as string | null,
    };
  }

  if (res.wordDestroyed) tracker.charsDestroyed += res.wordDestroyed.word.length;
  const action = {
    type: "KEY_HIT" as const,
    wordDestroyed: Boolean(res.wordDestroyed),
    isBoss: Boolean(res.wordDestroyed?.boss),
    newStreak: res.newStreak,
    scoreGained: res.scoreGained,
    targetWord,
  };
  const next = shooterGameReducer(prev, action);
  if (res.wordDestroyed) {
    const pwr =
      next.slowCharges > prev.slowCharges
        ? "+1 SLOW TIME"
        : next.shieldCharges > prev.shieldCharges
          ? "+1 SHIELD"
          : null;
    pushDestroyVisuals(sim, res.wordDestroyed, res.scoreGained, reducedMotion, pwr);
  }
  return {
    action,
    next,
    wrongExpectedChar: null as string | null,
    playLaser: Boolean(res.targetHit),
    playExplosion: Boolean(res.wordDestroyed),
    announcement:
      res.wordDestroyed && next.level > prev.level ? `Level up! Level ${next.level}` : null,
  };
}

export function resolveShooterBreachBridge(opts: {
  sim: MutableSimState;
  prev: ShooterGameState;
  breached: readonly Enemy[];
  practiceMode: boolean;
}) {
  const { sim, prev, breached, practiceMode } = opts;
  if (practiceMode) {
    const action = { type: "BREACH" as const, breachedCount: breached.length, practiceMode: true };
    return {
      action,
      next: shooterGameReducer(prev, action),
      playBreach: false,
      playShield: false,
      announcement: null as string | null,
      gameOver: false,
    };
  }
  const { shieldsUsed, damage } = resolveBreachOutcome(breached.length, prev.shieldCharges, false);
  pushShieldSavedVisuals(sim, breached, shieldsUsed);
  const action = { type: "BREACH" as const, breachedCount: breached.length, practiceMode: false };
  const next = shooterGameReducer(prev, action);
  return {
    action,
    next,
    playBreach: damage > 0,
    playShield: damage === 0,
    announcement:
      damage > 0
        ? `${damage} word${damage > 1 ? "s" : ""} breached defense!`
        : "Shield absorbed breach!",
    gameOver: damage > 0 && next.lives <= 0,
  };
}

export function buildBridgeRunSummary(
  endState: ShooterGameState,
  durationSec: number,
  settings: ShooterSettings,
  tracker: ShooterRunTracker,
) {
  return buildShooterRunSummary(endState, {
    durationSec,
    activeTypingSec: tracker.activeTypingSec,
    charsDestroyed: tracker.charsDestroyed,
    difficulty: settings.difficulty,
    practiceMode: settings.practiceMode,
    dailyChallengeDate: tracker.dailyDate,
    samples: tracker.samples,
  });
}
