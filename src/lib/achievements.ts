import { z } from "./zodSetup";
import type { Storage } from "./storage";
import type { HistoryEntry } from "./typingStats";

/**
 * Mastery-aligned achievements v2 (40 achievements across 7 categories), persisted across sessions.
 * Pure evaluator: callers load, evaluate, then save.
 */
export const ACHIEVEMENTS_KEY = "ttp:achievements:v1";

export type AchievementCategory =
  "speed" | "accuracy" | "consistency" | "volume" | "streaks" | "mastery" | "shooter";

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string }[] = [
  { id: "speed", label: "Speed" },
  { id: "accuracy", label: "Accuracy" },
  { id: "consistency", label: "Consistency" },
  { id: "volume", label: "Volume" },
  { id: "streaks", label: "Streaks" },
  { id: "mastery", label: "Key Mastery" },
  { id: "shooter", label: "Word Shooter" },
];

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  target: number;
  unit: string;
  counterKey?: string;
}

export interface AchievementState {
  /** id -> ISO timestamp of unlock. */
  unlocked: Record<string, string>;
  /** Named progress counters and lifetime highs. */
  counters: Record<string, number>;
}

export const EMPTY_ACHIEVEMENTS: AchievementState = { unlocked: {}, counters: {} };

export const ACHIEVEMENTS: AchievementDef[] = [
  // Volume (starts & milestones)
  {
    id: "first-run",
    title: "First Steps",
    description: "Complete your first run in any mode.",
    category: "volume",
    target: 1,
    unit: "runs",
    counterKey: "totalRuns",
  },
  {
    id: "runs-10",
    title: "Warm Routine",
    description: "Complete 10 runs across Drill or Word Shooter.",
    category: "volume",
    target: 10,
    unit: "runs",
    counterKey: "totalRuns",
  },
  {
    id: "runs-50",
    title: "Dedicated Typist",
    description: "Complete 50 runs across Drill or Word Shooter.",
    category: "volume",
    target: 50,
    unit: "runs",
    counterKey: "totalRuns",
  },
  {
    id: "words-500",
    title: "First Chapter",
    description: "Type 500 total words across all sessions.",
    category: "volume",
    target: 500,
    unit: "words",
    counterKey: "totalWords",
  },
  {
    id: "words-2500",
    title: "Short Story",
    description: "Type 2,500 total words across all sessions.",
    category: "volume",
    target: 2500,
    unit: "words",
    counterKey: "totalWords",
  },
  {
    id: "words-10000",
    title: "Novelist",
    description: "Type 10,000 total words across all sessions.",
    category: "volume",
    target: 10000,
    unit: "words",
    counterKey: "totalWords",
  },
  {
    id: "words-25000",
    title: "Archivist",
    description: "Type 25,000 total words across all sessions.",
    category: "volume",
    target: 25000,
    unit: "words",
    counterKey: "totalWords",
  },

  // Speed milestones (overall & per test type)
  {
    id: "speed-40",
    title: "Warmed Up",
    description: "Reach 40 WPM in any mode.",
    category: "speed",
    target: 40,
    unit: "WPM",
    counterKey: "bestWpmAny",
  },
  {
    id: "speed-60",
    title: "Flow State",
    description: "Reach 60 WPM in any mode.",
    category: "speed",
    target: 60,
    unit: "WPM",
    counterKey: "bestWpmAny",
  },
  {
    id: "speed-80",
    title: "Lightning Hands",
    description: "Reach 80 WPM in any mode.",
    category: "speed",
    target: 80,
    unit: "WPM",
    counterKey: "bestWpmAny",
  },
  {
    id: "speed-100",
    title: "Century Club",
    description: "Reach 100 WPM in any mode.",
    category: "speed",
    target: 100,
    unit: "WPM",
    counterKey: "bestWpmAny",
  },
  {
    id: "speed-120",
    title: "Supersonic",
    description: "Reach 120 WPM in any drill run.",
    category: "speed",
    target: 120,
    unit: "WPM",
    counterKey: "bestWpmDrill",
  },
  {
    id: "speed-time-60",
    title: "Minute Sprinter",
    description: "Reach 70 WPM in a 60s timed drill.",
    category: "speed",
    target: 70,
    unit: "WPM",
    counterKey: "bestWpmTime60",
  },
  {
    id: "speed-time-120",
    title: "Endurance Racer",
    description: "Reach 65 WPM in a 120s timed drill.",
    category: "speed",
    target: 65,
    unit: "WPM",
    counterKey: "bestWpmTime120",
  },
  {
    id: "speed-words-80",
    title: "Word Dash",
    description: "Reach 80 WPM in a Words quota drill.",
    category: "speed",
    target: 80,
    unit: "WPM",
    counterKey: "bestWpmWords",
  },
  {
    id: "speed-quote-70",
    title: "Prose Virtuoso",
    description: "Reach 70 WPM in a Quote drill.",
    category: "speed",
    target: 70,
    unit: "WPM",
    counterKey: "bestWpmQuote",
  },

  // Accuracy (flawless runs of different lengths + sustained accuracy)
  {
    id: "flawless",
    title: "Flawless Spark",
    description: "Finish a run with 100% accuracy (50+ chars in Drill, 10+ words in Shooter).",
    category: "accuracy",
    target: 50,
    unit: "chars",
    counterKey: "bestFlawlessChars",
  },
  {
    id: "flawless-25w",
    title: "Clean Quarter",
    description: "Finish a drill of 125+ characters (25+ words) with 100% accuracy.",
    category: "accuracy",
    target: 125,
    unit: "chars",
    counterKey: "bestFlawlessChars",
  },
  {
    id: "flawless-50w",
    title: "Precision Craft",
    description: "Finish a drill of 250+ characters (50+ words) with 100% accuracy.",
    category: "accuracy",
    target: 250,
    unit: "chars",
    counterKey: "bestFlawlessChars",
  },
  {
    id: "flawless-100w",
    title: "Untouchable",
    description: "Finish a drill of 500+ characters (100+ words) with 100% accuracy.",
    category: "accuracy",
    target: 500,
    unit: "chars",
    counterKey: "bestFlawlessChars",
  },
  {
    id: "acc-98-5",
    title: "Steady Aim",
    description: "Complete 5 drill runs with at least 98% accuracy.",
    category: "accuracy",
    target: 5,
    unit: "runs",
    counterKey: "acc98Runs",
  },

  // Consistency
  {
    id: "consistency-85",
    title: "Even Tempo",
    description: "Finish a drill (100+ chars) with 85%+ pacing consistency.",
    category: "consistency",
    target: 85,
    unit: "%",
    counterKey: "bestConsistency",
  },
  {
    id: "consistency-92",
    title: "Metronome",
    description: "Finish a drill (100+ chars) with 92%+ pacing consistency.",
    category: "consistency",
    target: 92,
    unit: "%",
    counterKey: "bestConsistency",
  },
  {
    id: "consistency-96",
    title: "Clockwork",
    description: "Finish a drill (150+ chars) with 96%+ pacing consistency.",
    category: "consistency",
    target: 96,
    unit: "%",
    counterKey: "bestConsistency150",
  },

  // Streaks
  {
    id: "streak-3",
    title: "Three-Day Spark",
    description: "Reach a 3-day daily goal streak.",
    category: "streaks",
    target: 3,
    unit: "days",
    counterKey: "bestStreak",
  },
  {
    id: "streak-7",
    title: "On Fire",
    description: "Keep a 7-day daily goal streak alive.",
    category: "streaks",
    target: 7,
    unit: "days",
    counterKey: "bestStreak",
  },
  {
    id: "streak-30",
    title: "Iron Habit",
    description: "Maintain a 30-day daily goal streak.",
    category: "streaks",
    target: 30,
    unit: "days",
    counterKey: "bestStreak",
  },

  // Key Mastery
  {
    id: "focus-5",
    title: "Focused Specialist",
    description: "Complete 5 drills in Focused weak-key mode.",
    category: "mastery",
    target: 5,
    unit: "runs",
    counterKey: "focusRuns",
  },
  {
    id: "weak-key-1",
    title: "Key Mender",
    description: "Improve a weak key with zero mistakes on it in a 95%+ accuracy drill.",
    category: "mastery",
    target: 1,
    unit: "wins",
    counterKey: "weakKeyImproved",
  },
  {
    id: "weak-key-5",
    title: "Key Alchemist",
    description: "Improve weak keys cleanly across 5 separate drills.",
    category: "mastery",
    target: 5,
    unit: "wins",
    counterKey: "weakKeyImproved",
  },
  {
    id: "word-redeemer",
    title: "Word Redeemer",
    description: "Graduate a missed word out of your queue with 3 clean completions.",
    category: "mastery",
    target: 1,
    unit: "words",
    counterKey: "wordsGraduated",
  },
  {
    id: "learn-first-unlock",
    title: "Seventh Key",
    description: "Unlock your first new letter (7/26) in Learn mode.",
    category: "mastery",
    target: 7,
    unit: "keys",
    counterKey: "maxLearnUnlocked",
  },
  {
    id: "learn-halfway",
    title: "Halfway Keyboard",
    description: "Unlock 13 of 26 letters in Learn mode.",
    category: "mastery",
    target: 13,
    unit: "keys",
    counterKey: "maxLearnUnlocked",
  },
  {
    id: "learn-all-26",
    title: "Full Alphabet",
    description: "Unlock all 26 letters in Learn mode.",
    category: "mastery",
    target: 26,
    unit: "keys",
    counterKey: "maxLearnUnlocked",
  },

  // Word Shooter
  {
    id: "shooter-level-5",
    title: "Ace Pilot",
    description: "Reach level 5 in Word Shooter.",
    category: "shooter",
    target: 5,
    unit: "level",
    counterKey: "bestShooterLevel",
  },
  {
    id: "shooter-level-10",
    title: "Star Commander",
    description: "Reach level 10 in Word Shooter.",
    category: "shooter",
    target: 10,
    unit: "level",
    counterKey: "bestShooterLevel",
  },
  {
    id: "boss-slayer",
    title: "Boss Slayer",
    description: "Defeat a boss word in Word Shooter.",
    category: "shooter",
    target: 1,
    unit: "bosses",
    counterKey: "bossesDefeated",
  },
  {
    id: "boss-hunter-5",
    title: "Boss Hunter",
    description: "Defeat 5 boss words across Word Shooter runs.",
    category: "shooter",
    target: 5,
    unit: "bosses",
    counterKey: "bossesDefeated",
  },
  {
    id: "shooter-streak-15",
    title: "Combo Marksman",
    description: "Reach a 15-word streak in a single Word Shooter run.",
    category: "shooter",
    target: 15,
    unit: "streak",
    counterKey: "bestShooterStreak",
  },
  {
    id: "shooter-streak-30",
    title: "Unstoppable Volley",
    description: "Reach a 30-word streak in a single Word Shooter run.",
    category: "shooter",
    target: 30,
    unit: "streak",
    counterKey: "bestShooterStreak",
  },
];

const VALID_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export const AchievementStateSchema = z.object({
  unlocked: z.record(z.string(), z.string().min(1).max(40)).optional(),
  counters: z.record(z.string().min(1).max(40), z.number().int().min(0).max(10_000_000)).optional(),
});

export interface RunContext {
  mode: "drill" | "shooter" | "learn";
  drillMode?: "time" | "words" | "quote" | undefined;
  durationSec?: number | undefined;
  wpm: number;
  accuracy: number;
  consistency?: number | undefined;
  /** Drill/Learn: total chars typed. */
  typed?: number | undefined;
  /** Drill/Learn: correct characters in final text. */
  correctChars?: number | undefined;
  /** Shooter: words destroyed. */
  wordsDestroyed?: number | undefined;
  /** Shooter: max streak in run. */
  shooterStreak?: number | undefined;
  /** Shooter: level reached. */
  level?: number | undefined;
  /** Shooter: number of boss words destroyed. */
  bossesDefeated?: number | undefined;
  /** Post-update daily streak for the run's day. */
  streak?: number | undefined;
  /** Drill only: Focused practice strategy was active. */
  focused?: boolean | undefined;
  /** Drill only: user cleanly typed a high-priority weak key in this run. */
  improvedWeakKey?: boolean | undefined;
  /** Drill only: count of missed words that graduated to mastered in this run. */
  wordsGraduated?: number | undefined;
  /** Drill only: true when user re-ran the exact same passage text; excluded from speed milestones. */
  repeated?: boolean | undefined;
  /** Learn only: number of letters unlocked after the lesson. */
  learnUnlockedCount?: number | undefined;
}

/**
 * Pure detector: returns true when the run has >= 95% overall accuracy and at least one
 * of the user's top 5 all-time weak keys appeared >= 5 times with 0 mistakes on it.
 */
export function didImproveWeakKey(
  weakKeys: readonly string[],
  passageText: string,
  mistakes: Record<string, number>,
  accuracy: number,
): boolean {
  if (weakKeys.length === 0 || accuracy < 95 || !passageText) return false;
  const lower = passageText.toLowerCase();
  for (const rawKey of weakKeys.slice(0, 5)) {
    const k = rawKey.toLowerCase();
    if (!k || k === " ") continue;
    let count = 0;
    for (const ch of lower) {
      if (ch === k) count++;
    }
    const errCount = (mistakes[k] ?? 0) + (mistakes[k.toUpperCase()] ?? 0);
    if (count >= 5 && errCount === 0) {
      return true;
    }
  }
  return false;
}

export function sanitizeAchievements(raw: unknown): AchievementState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { unlocked: {}, counters: {} };
  }
  const r = raw as { unlocked?: unknown; counters?: unknown };
  const unlocked: Record<string, string> = {};
  if (r.unlocked && typeof r.unlocked === "object" && !Array.isArray(r.unlocked)) {
    for (const [id, ts] of Object.entries(r.unlocked as Record<string, unknown>)) {
      if (VALID_IDS.has(id) && typeof ts === "string" && ts.length > 0 && ts.length <= 40) {
        unlocked[id] = ts;
      }
    }
  }
  const counters: Record<string, number> = {};
  if (r.counters && typeof r.counters === "object" && !Array.isArray(r.counters)) {
    for (const [k, v] of Object.entries(r.counters as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length <= 40 &&
        typeof v === "number" &&
        Number.isInteger(v) &&
        v > 0 &&
        v <= 10_000_000
      ) {
        counters[k] = v;
      }
    }
  }
  return { unlocked, counters };
}

export async function loadAchievementsFromStorage(storage: Storage): Promise<AchievementState> {
  try {
    const raw = await storage.get(ACHIEVEMENTS_KEY);
    if (raw === null) return { unlocked: {}, counters: {} };
    return sanitizeAchievements(raw);
  } catch {
    return { unlocked: {}, counters: {} };
  }
}

export async function saveAchievementsToStorage(
  storage: Storage,
  state: AchievementState,
): Promise<void> {
  try {
    await storage.set(ACHIEVEMENTS_KEY, sanitizeAchievements(state));
  } catch {
    // non-fatal
  }
}

/** Grant `id` if not yet unlocked. Returns true when newly granted. */
function grant(
  id: string,
  unlocked: Record<string, string>,
  now: string,
  newly: AchievementDef[],
): boolean {
  if (unlocked[id]) return false;
  unlocked[id] = now;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (def) newly.push(def);
  return true;
}

function maxCounter(counters: Record<string, number>, key: string, value: number): void {
  const clean = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (clean > (counters[key] ?? 0)) {
    counters[key] = clean;
  }
}

/**
 * Pure: never mutates `prev`. Updates lifetime progress counters and grants any newly
 * satisfied achievements. Evaluating the same single-run thresholds twice is idempotent.
 */
export function evaluateAchievements(
  ctx: RunContext,
  prev: AchievementState,
): { state: AchievementState; newlyUnlocked: AchievementDef[] } {
  const unlocked = { ...prev.unlocked };
  const counters = { ...prev.counters };
  const now = new Date().toISOString();
  const newlyUnlocked: AchievementDef[] = [];

  const wpm = Number.isFinite(ctx.wpm) ? Math.max(0, ctx.wpm) : 0;
  const acc = Number.isFinite(ctx.accuracy) ? Math.max(0, Math.min(100, ctx.accuracy)) : 0;
  const consistency = Number.isFinite(ctx.consistency ?? 0)
    ? Math.max(0, Math.min(100, ctx.consistency ?? 0))
    : 0;
  const typed = Math.max(0, Math.floor(ctx.typed ?? 0));
  const correctChars = Math.max(0, Math.floor(ctx.correctChars ?? typed));
  const streak = Math.max(0, Math.floor(ctx.streak ?? 0));

  // Update lifetime counters
  counters["totalRuns"] = (counters["totalRuns"] ?? 0) + 1;
  const runWords =
    ctx.mode === "shooter"
      ? Math.max(0, Math.floor(ctx.wordsDestroyed ?? 0))
      : Math.floor(correctChars / 5);
  if (runWords > 0) {
    counters["totalWords"] = (counters["totalWords"] ?? 0) + runWords;
  }

  const isLearn = ctx.mode === "learn";
  if (!ctx.repeated && !isLearn) {
    maxCounter(counters, "bestWpmAny", wpm);
  }
  maxCounter(counters, "bestStreak", streak);

  if (ctx.mode === "drill") {
    if (!ctx.repeated) {
      maxCounter(counters, "bestWpmDrill", wpm);
      if (ctx.drillMode === "time" && ctx.durationSec === 60) {
        maxCounter(counters, "bestWpmTime60", wpm);
      }
      if (ctx.drillMode === "time" && ctx.durationSec === 120) {
        maxCounter(counters, "bestWpmTime120", wpm);
      }
      if (ctx.drillMode === "words") {
        maxCounter(counters, "bestWpmWords", wpm);
      }
      if (ctx.drillMode === "quote") {
        maxCounter(counters, "bestWpmQuote", wpm);
      }
    }
    if (acc >= 100 && typed >= 50) {
      maxCounter(counters, "bestFlawlessChars", typed);
    }
    if (acc >= 98 && typed >= 25) {
      counters["acc98Runs"] = (counters["acc98Runs"] ?? 0) + 1;
    }
    if (typed >= 100) {
      maxCounter(counters, "bestConsistency", consistency);
    }
    if (typed >= 150) {
      maxCounter(counters, "bestConsistency150", consistency);
    }
  } else if (ctx.mode === "shooter") {
    const wordsDestroyed = Math.max(0, Math.floor(ctx.wordsDestroyed ?? 0));
    if (acc >= 100 && wordsDestroyed >= 10) {
      maxCounter(counters, "bestFlawlessChars", Math.max(50, wordsDestroyed * 5));
    }
    maxCounter(counters, "bestShooterLevel", ctx.level ?? 1);
    maxCounter(counters, "bestShooterStreak", ctx.shooterStreak ?? 0);
    if ((ctx.bossesDefeated ?? 0) > 0) {
      counters["bossesDefeated"] = (counters["bossesDefeated"] ?? 0) + (ctx.bossesDefeated ?? 0);
    }
  }

  if (ctx.learnUnlockedCount !== undefined) {
    maxCounter(counters, "maxLearnUnlocked", ctx.learnUnlockedCount);
  }
  if (ctx.focused) {
    counters["focusRuns"] = (counters["focusRuns"] ?? 0) + 1;
  }
  if (ctx.improvedWeakKey) {
    counters["weakKeyImproved"] = (counters["weakKeyImproved"] ?? 0) + 1;
  }
  if ((ctx.wordsGraduated ?? 0) > 0) {
    counters["wordsGraduated"] = (counters["wordsGraduated"] ?? 0) + (ctx.wordsGraduated ?? 0);
  }

  // Evaluate Speed (excluded for repeated-passage and learn-mode runs)
  if (!ctx.repeated && !isLearn) {
    if (wpm >= 40) grant("speed-40", unlocked, now, newlyUnlocked);
    if (wpm >= 60) grant("speed-60", unlocked, now, newlyUnlocked);
    if (wpm >= 80) grant("speed-80", unlocked, now, newlyUnlocked);
    if (wpm >= 100) grant("speed-100", unlocked, now, newlyUnlocked);
    if (ctx.mode === "drill" && wpm >= 120) grant("speed-120", unlocked, now, newlyUnlocked);
    if (ctx.mode === "drill" && ctx.drillMode === "time" && ctx.durationSec === 60 && wpm >= 70) {
      grant("speed-time-60", unlocked, now, newlyUnlocked);
    }
    if (ctx.mode === "drill" && ctx.drillMode === "time" && ctx.durationSec === 120 && wpm >= 65) {
      grant("speed-time-120", unlocked, now, newlyUnlocked);
    }
    if (ctx.mode === "drill" && ctx.drillMode === "words" && wpm >= 80) {
      grant("speed-words-80", unlocked, now, newlyUnlocked);
    }
    if (ctx.mode === "drill" && ctx.drillMode === "quote" && wpm >= 70) {
      grant("speed-quote-70", unlocked, now, newlyUnlocked);
    }
  }

  // Evaluate Accuracy
  if (ctx.mode === "drill" && acc >= 100 && typed >= 50) {
    grant("flawless", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "shooter" && acc >= 100 && (ctx.wordsDestroyed ?? 0) >= 10) {
    grant("flawless", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "drill" && acc >= 100 && typed >= 125) {
    grant("flawless-25w", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "drill" && acc >= 100 && typed >= 250) {
    grant("flawless-50w", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "drill" && acc >= 100 && typed >= 500) {
    grant("flawless-100w", unlocked, now, newlyUnlocked);
  }
  if ((counters["acc98Runs"] ?? 0) >= 5) {
    grant("acc-98-5", unlocked, now, newlyUnlocked);
  }

  // Evaluate Consistency
  if (ctx.mode === "drill" && typed >= 100 && consistency >= 85) {
    grant("consistency-85", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "drill" && typed >= 100 && consistency >= 92) {
    grant("consistency-92", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "drill" && typed >= 150 && consistency >= 96) {
    grant("consistency-96", unlocked, now, newlyUnlocked);
  }

  // Evaluate Streaks
  if (streak >= 3) grant("streak-3", unlocked, now, newlyUnlocked);
  if (streak >= 7) grant("streak-7", unlocked, now, newlyUnlocked);
  if (streak >= 30) grant("streak-30", unlocked, now, newlyUnlocked);

  // Evaluate Key Mastery
  if ((counters["focusRuns"] ?? 0) >= 5) grant("focus-5", unlocked, now, newlyUnlocked);
  if ((counters["weakKeyImproved"] ?? 0) >= 1) grant("weak-key-1", unlocked, now, newlyUnlocked);
  if ((counters["weakKeyImproved"] ?? 0) >= 5) grant("weak-key-5", unlocked, now, newlyUnlocked);
  if ((counters["wordsGraduated"] ?? 0) >= 1) grant("word-redeemer", unlocked, now, newlyUnlocked);
  if ((counters["maxLearnUnlocked"] ?? 0) >= 7) {
    grant("learn-first-unlock", unlocked, now, newlyUnlocked);
  }
  if ((counters["maxLearnUnlocked"] ?? 0) >= 13) {
    grant("learn-halfway", unlocked, now, newlyUnlocked);
  }
  if ((counters["maxLearnUnlocked"] ?? 0) >= 26) {
    grant("learn-all-26", unlocked, now, newlyUnlocked);
  }

  // Evaluate Shooter
  if (ctx.mode === "shooter") {
    if ((ctx.level ?? 0) >= 5) grant("shooter-level-5", unlocked, now, newlyUnlocked);
    if ((ctx.level ?? 0) >= 10) grant("shooter-level-10", unlocked, now, newlyUnlocked);
    if ((ctx.bossesDefeated ?? 0) >= 1) grant("boss-slayer", unlocked, now, newlyUnlocked);
    if ((counters["bossesDefeated"] ?? 0) >= 5)
      grant("boss-hunter-5", unlocked, now, newlyUnlocked);
    if ((ctx.shooterStreak ?? 0) >= 15) grant("shooter-streak-15", unlocked, now, newlyUnlocked);
    if ((ctx.shooterStreak ?? 0) >= 30) grant("shooter-streak-30", unlocked, now, newlyUnlocked);
  }

  // Evaluate Volume
  grant("first-run", unlocked, now, newlyUnlocked);
  if ((counters["totalRuns"] ?? 0) >= 10) grant("runs-10", unlocked, now, newlyUnlocked);
  if ((counters["totalRuns"] ?? 0) >= 50) grant("runs-50", unlocked, now, newlyUnlocked);
  if ((counters["totalWords"] ?? 0) >= 500) grant("words-500", unlocked, now, newlyUnlocked);
  if ((counters["totalWords"] ?? 0) >= 2500) grant("words-2500", unlocked, now, newlyUnlocked);
  if ((counters["totalWords"] ?? 0) >= 10000) grant("words-10000", unlocked, now, newlyUnlocked);
  if ((counters["totalWords"] ?? 0) >= 25000) grant("words-25000", unlocked, now, newlyUnlocked);

  return { state: { unlocked, counters }, newlyUnlocked };
}

export interface AchievementProgress {
  def: AchievementDef;
  unlockedAt: string | null;
  current: number;
  target: number;
  percent: number;
}

export interface AchievementFallbackContext {
  history?: readonly HistoryEntry[] | undefined;
  longestStreak?: number | undefined;
  learnUnlockedCount?: number | undefined;
}

function isLearnHistoryMode(mode: string): boolean {
  const m = mode.trim().toLowerCase();
  return m === "learn" || m.startsWith("learn-") || m.startsWith("learn:");
}

function deriveHistoryCounter(
  counterKey: string | undefined,
  ctx?: AchievementFallbackContext,
): number {
  if (!counterKey || !ctx) return 0;
  const history = ctx.history ?? [];
  switch (counterKey) {
    case "totalRuns":
      return history.length;
    case "totalWords":
      return history.reduce(
        (sum, h) =>
          sum + (h.mode === "shooter" ? (h.wordsDestroyed ?? 0) : Math.floor((h.correct ?? 0) / 5)),
        0,
      );
    case "bestWpmAny":
      return Math.floor(
        history
          .filter((h) => !h.repeated && !isLearnHistoryMode(h.mode))
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestWpmDrill":
      return Math.floor(
        history
          .filter((h) => h.mode !== "shooter" && !h.repeated && !isLearnHistoryMode(h.mode))
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestWpmTime60":
      return Math.floor(
        history
          .filter((h) => !h.repeated && (h.mode === "60s" || h.mode === "60"))
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestWpmTime120":
      return Math.floor(
        history
          .filter((h) => !h.repeated && (h.mode === "120s" || h.mode === "120"))
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestWpmWords":
      return Math.floor(
        history
          .filter((h) => !h.repeated && /^\d+w$/.test(h.mode))
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestWpmQuote":
      return Math.floor(
        history
          .filter((h) => !h.repeated && h.mode === "quote")
          .reduce((m, h) => Math.max(m, h.wpm), 0),
      );
    case "bestFlawlessChars":
      return history
        .filter((h) => h.accuracy >= 100)
        .reduce(
          (m, h) =>
            Math.max(m, h.mode === "shooter" ? (h.wordsDestroyed ?? 0) * 5 : (h.typed ?? 0)),
          0,
        );
    case "acc98Runs":
      return history.filter((h) => h.mode !== "shooter" && h.accuracy >= 98 && h.typed >= 25)
        .length;
    case "bestConsistency":
      return Math.floor(
        history
          .filter((h) => h.mode !== "shooter" && h.typed >= 100)
          .reduce((m, h) => Math.max(m, h.consistency), 0),
      );
    case "bestConsistency150":
      return Math.floor(
        history
          .filter((h) => h.mode !== "shooter" && h.typed >= 150)
          .reduce((m, h) => Math.max(m, h.consistency), 0),
      );
    case "bestStreak":
      return ctx.longestStreak ?? 0;
    case "bestShooterLevel":
      return history
        .filter((h) => h.mode === "shooter")
        .reduce((m, h) => Math.max(m, h.level ?? 0), 0);
    case "bossesDefeated":
      return history
        .filter((h) => h.mode === "shooter")
        .reduce((sum, h) => sum + (h.bossesDefeated ?? 0), 0);
    case "bestShooterStreak":
      return history
        .filter((h) => h.mode === "shooter")
        .reduce((m, h) => Math.max(m, h.maxStreak ?? 0), 0);
    case "maxLearnUnlocked":
      return ctx.learnUnlockedCount ?? 0;
    default:
      return 0;
  }
}

export function getAchievementProgress(
  def: AchievementDef,
  state: AchievementState,
  fallbackCtx?: AchievementFallbackContext,
): AchievementProgress {
  const unlockedAt = state.unlocked[def.id] ?? null;
  const counterVal = def.counterKey ? (state.counters[def.counterKey] ?? 0) : 0;
  const derivedVal = deriveHistoryCounter(def.counterKey, fallbackCtx);
  const rawCurrent = Math.max(counterVal, derivedVal);
  const current = unlockedAt ? Math.max(def.target, rawCurrent) : Math.min(def.target, rawCurrent);
  const percent = unlockedAt
    ? 100
    : Math.min(99, Math.round((current / Math.max(1, def.target)) * 100));

  return {
    def,
    unlockedAt,
    current,
    target: def.target,
    percent,
  };
}

export function getAllAchievementsProgress(
  state: AchievementState,
  fallbackCtx?: AchievementFallbackContext,
): AchievementProgress[] {
  return ACHIEVEMENTS.map((def) => getAchievementProgress(def, state, fallbackCtx));
}

export function getNextUpAchievements(
  state: AchievementState,
  fallbackCtx?: AchievementFallbackContext,
  limit = 4,
): AchievementProgress[] {
  return getAllAchievementsProgress(state, fallbackCtx)
    .filter((p) => !p.unlockedAt)
    .sort((a, b) => b.percent - a.percent || a.def.target - b.def.target)
    .slice(0, limit);
}
