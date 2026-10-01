/**
 * Mastery-aligned achievements, persisted across sessions.
 * Pure evaluator: callers load, evaluate, then save.
 */
export const ACHIEVEMENTS_KEY = "ttp:achievements:v1";

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
}

export interface AchievementState {
  /** id -> ISO timestamp of unlock. */
  unlocked: Record<string, string>;
  /** Named counters (e.g. focusRuns). */
  counters: Record<string, number>;
}

export const EMPTY_ACHIEVEMENTS: AchievementState = { unlocked: {}, counters: {} };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-run", title: "First Steps", description: "Complete your first run in any mode." },
  { id: "speed-40", title: "Warmed Up", description: "Reach 40 WPM in any mode." },
  { id: "speed-60", title: "Flow State", description: "Reach 60 WPM in any mode." },
  { id: "speed-80", title: "Lightning Hands", description: "Reach 80 WPM in any mode." },
  { id: "speed-100", title: "Century Club", description: "Reach 100 WPM in any mode." },
  {
    id: "flawless",
    title: "Flawless",
    description: "Finish a run with 100% accuracy (50+ chars in Drill, 10+ words in Shooter).",
  },
  { id: "streak-7", title: "On Fire", description: "Keep a 7-day practice streak alive." },
  {
    id: "focus-5",
    title: "Locksight",
    description: "Complete 5 drill runs in Focused practice mode.",
  },
  { id: "shooter-level-5", title: "Ace Pilot", description: "Reach level 5 in Word Shooter." },
  {
    id: "boss-slayer",
    title: "Boss Slayer",
    description: "Clear a boss wave in Word Shooter (reach level 6).",
  },
];

const VALID_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

export interface RunContext {
  mode: "drill" | "shooter";
  wpm: number;
  accuracy: number;
  /** Drill: total chars typed. */
  typed?: number | undefined;
  /** Shooter: words destroyed. */
  wordsDestroyed?: number | undefined;
  /** Shooter: level reached. */
  level?: number | undefined;
  /** Post-update daily streak for the run's day. */
  streak?: number | undefined;
  /** Drill only: Focused practice strategy was active. */
  focused?: boolean | undefined;
}

function sanitize(raw: unknown): AchievementState {
  if (!raw || typeof raw !== "object") return { unlocked: {}, counters: {} };
  const r = raw as { unlocked?: unknown; counters?: unknown };
  const unlocked: Record<string, string> = {};
  if (r.unlocked && typeof r.unlocked === "object") {
    for (const [id, ts] of Object.entries(r.unlocked as Record<string, unknown>)) {
      if (VALID_IDS.has(id) && typeof ts === "string" && ts.length > 0 && ts.length <= 40) {
        unlocked[id] = ts;
      }
    }
  }
  const counters: Record<string, number> = {};
  if (r.counters && typeof r.counters === "object") {
    for (const [k, v] of Object.entries(r.counters as Record<string, unknown>)) {
      if (
        typeof k === "string" &&
        k.length > 0 &&
        k.length <= 40 &&
        Number.isInteger(v) &&
        (v as number) > 0 &&
        (v as number) <= 1_000_000
      ) {
        counters[k] = v as number;
      }
    }
  }
  return { unlocked, counters };
}

export function loadAchievements(): AchievementState {
  if (typeof window === "undefined") return { unlocked: {}, counters: {} };
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return { unlocked: {}, counters: {} };
    return sanitize(JSON.parse(raw));
  } catch {
    return { unlocked: {}, counters: {} };
  }
}

export function saveAchievements(state: AchievementState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(state));
  } catch {
    // quota-safe: achievements are non-critical, drop the write
  }
}

export function clearAchievements(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACHIEVEMENTS_KEY);
  } catch {
    // ignore
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

/**
 * Pure: never mutates `prev`. Any completed run unlocks "first-run";
 * everything else is threshold- or counter-driven. Evaluating the same
 * context twice yields no new unlocks (idempotent).
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
  if (wpm >= 40) grant("speed-40", unlocked, now, newlyUnlocked);
  if (wpm >= 60) grant("speed-60", unlocked, now, newlyUnlocked);
  if (wpm >= 80) grant("speed-80", unlocked, now, newlyUnlocked);
  if (wpm >= 100) grant("speed-100", unlocked, now, newlyUnlocked);

  const acc = Number.isFinite(ctx.accuracy) ? Math.max(0, Math.min(100, ctx.accuracy)) : 0;
  if (ctx.mode === "drill" && acc >= 100 && (ctx.typed ?? 0) >= 50) {
    grant("flawless", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "shooter" && acc >= 100 && (ctx.wordsDestroyed ?? 0) >= 10) {
    grant("flawless", unlocked, now, newlyUnlocked);
  }

  if ((ctx.streak ?? 0) >= 7) grant("streak-7", unlocked, now, newlyUnlocked);

  if (ctx.mode === "shooter" && (ctx.level ?? 0) >= 5) {
    grant("shooter-level-5", unlocked, now, newlyUnlocked);
  }
  if (ctx.mode === "shooter" && (ctx.level ?? 0) >= 6) {
    grant("boss-slayer", unlocked, now, newlyUnlocked);
  }

  if (ctx.focused) counters["focusRuns"] = (counters["focusRuns"] ?? 0) + 1;
  if ((counters["focusRuns"] ?? 0) >= 5) grant("focus-5", unlocked, now, newlyUnlocked);

  // Any completed run counts as "First Steps".
  grant("first-run", unlocked, now, newlyUnlocked);

  return { state: { unlocked, counters }, newlyUnlocked };
}
