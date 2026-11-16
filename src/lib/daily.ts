import { z } from "zod";
import type { Storage } from "./storage";

export type GoalType = "minutes" | "runs";

export interface DailyGoalConfig {
  goalType: GoalType;
  goalTarget: number;
  freezeEnabled: boolean;
}

export interface DailyState extends DailyGoalConfig {
  lastDate: string; // "YYYY-MM-DD"
  streak: number;
  longestStreak: number;
  runsToday: number;
  activeSecondsToday: number;
  goalMetToday: boolean;
  lastGoalMetDate: string | null;
  previousGoalMetDate?: string | null | undefined;
  lastFreezeUsedDate: string | null;
}

export interface EffectiveDaily extends DailyGoalConfig {
  streak: number;
  longestStreak: number;
  runsToday: number;
  activeSecondsToday: number;
  minutesToday: number;
  goalMetToday: boolean;
  freezeAvailable: boolean;
  freezeActive: boolean;
  progressPercent: number;
}

export const DAILY_STORAGE_KEY = "ttp:daily:v1";
export const DEFAULT_GOAL_TYPE: GoalType = "minutes";
export const DEFAULT_GOAL_MINUTES = 5;
export const DEFAULT_GOAL_RUNS = 3;
export const FREEZE_COOLDOWN_DAYS = 7;

export const DEFAULT_DAILY_GOAL_CONFIG: DailyGoalConfig = {
  goalType: DEFAULT_GOAL_TYPE,
  goalTarget: DEFAULT_GOAL_MINUTES,
  freezeEnabled: true,
};

export const DailyGoalConfigSchema = z.object({
  goalType: z.enum(["minutes", "runs"]).optional(),
  goalTarget: z.number().finite().optional(),
  freezeEnabled: z.boolean().optional(),
});

export const DailyStateSchema = z.object({
  lastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  streak: z.number().int().min(0),
  longestStreak: z.number().int().min(0).optional(),
  runsToday: z.number().int().min(0),
  activeSecondsToday: z.number().finite().min(0).optional(),
  goalMetToday: z.boolean().optional(),
  lastGoalMetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  previousGoalMetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  goalType: z.enum(["minutes", "runs"]).optional(),
  goalTarget: z.number().finite().optional(),
  freezeEnabled: z.boolean().optional(),
  lastFreezeUsedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

const roundTenths = (n: number): number => Math.round(Math.max(0, n) * 10) / 10;

export function sanitizeGoalTarget(goalType: GoalType, rawTarget: unknown): number {
  const fallback = goalType === "minutes" ? DEFAULT_GOAL_MINUTES : DEFAULT_GOAL_RUNS;
  if (typeof rawTarget !== "number" || !Number.isFinite(rawTarget)) return fallback;
  const max = goalType === "minutes" ? 120 : 50;
  return Math.min(max, Math.max(1, Math.round(rawTarget)));
}

export function sanitizeDailyState(raw: unknown): DailyState | null {
  const parsed = DailyStateSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;

  // Detect legacy v1 payload (no goalType/goalMetToday/activeSecondsToday fields stored).
  const isLegacyV1 =
    d.goalType === undefined &&
    d.goalMetToday === undefined &&
    d.activeSecondsToday === undefined &&
    d.lastGoalMetDate === undefined;

  if (isLegacyV1) {
    const legacyMet = d.runsToday >= DEFAULT_GOAL_RUNS;
    const streak = legacyMet ? d.streak + 1 : d.streak;
    const lastGoalMetDate = legacyMet ? d.lastDate : d.streak > 0 ? addDays(d.lastDate, -1) : null;
    return {
      lastDate: d.lastDate,
      streak,
      longestStreak: Math.max(d.longestStreak ?? 0, streak),
      runsToday: d.runsToday,
      activeSecondsToday: 0,
      goalMetToday: legacyMet,
      lastGoalMetDate,
      previousGoalMetDate: null,
      goalType: "runs",
      goalTarget: DEFAULT_GOAL_RUNS,
      freezeEnabled: true,
      lastFreezeUsedDate: null,
    };
  }

  const goalType: GoalType = d.goalType ?? DEFAULT_GOAL_TYPE;
  const goalTarget = sanitizeGoalTarget(goalType, d.goalTarget);
  const runsToday = d.runsToday;
  const activeSecondsToday = roundTenths(d.activeSecondsToday ?? 0);
  const goalMetToday =
    d.goalMetToday ?? isGoalMet(runsToday, activeSecondsToday, goalType, goalTarget);
  const lastGoalMetDate =
    d.lastGoalMetDate !== undefined ? d.lastGoalMetDate : goalMetToday ? d.lastDate : null;

  return {
    lastDate: d.lastDate,
    streak: d.streak,
    longestStreak: Math.max(d.longestStreak ?? 0, d.streak),
    runsToday,
    activeSecondsToday,
    goalMetToday,
    lastGoalMetDate,
    previousGoalMetDate: d.previousGoalMetDate ?? null,
    goalType,
    goalTarget,
    freezeEnabled: d.freezeEnabled ?? true,
    lastFreezeUsedDate: d.lastFreezeUsedDate ?? null,
  };
}

/**
 * Calendar day difference (`dateB - dateA`) using UTC midnight so local DST transitions
 * (23h / 25h days) never skew day counts.
 */
export function daysBetween(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split("-").map(Number);
  const [y2, m2, d2] = dateB.split("-").map(Number);
  const utc1 = Date.UTC(y1 ?? 0, (m1 ?? 1) - 1, d1 ?? 1);
  const utc2 = Date.UTC(y2 ?? 0, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isGoalMet(
  runsToday: number,
  activeSecondsToday: number,
  goalType: GoalType,
  goalTarget: number,
): boolean {
  if (goalType === "runs") {
    return runsToday >= goalTarget;
  }
  return activeSecondsToday >= goalTarget * 60;
}

function canUseFreezeForDay(
  lastFreezeUsedDate: string | null,
  missedDate: string,
  freezeEnabled: boolean,
): boolean {
  if (!freezeEnabled) return false;
  if (!lastFreezeUsedDate) return true;
  return daysBetween(lastFreezeUsedDate, missedDate) >= FREEZE_COOLDOWN_DAYS;
}

function createEmptyDailyState(
  todayDate: string,
  config: DailyGoalConfig = DEFAULT_DAILY_GOAL_CONFIG,
): DailyState {
  const goalType = config.goalType;
  const goalTarget = sanitizeGoalTarget(goalType, config.goalTarget);
  return {
    lastDate: todayDate,
    streak: 0,
    longestStreak: 0,
    runsToday: 0,
    activeSecondsToday: 0,
    goalMetToday: false,
    lastGoalMetDate: null,
    previousGoalMetDate: null,
    goalType,
    goalTarget,
    freezeEnabled: config.freezeEnabled,
    lastFreezeUsedDate: null,
  };
}

export function recordRunToday(
  state: DailyState | null,
  todayDate: string,
  activeSeconds = 0,
): DailyState {
  const prev = (state ? sanitizeDailyState(state) : null) ?? createEmptyDailyState(todayDate);
  const addSec = Number.isFinite(activeSeconds) ? roundTenths(activeSeconds) : 0;
  const diffFromLastDate = daysBetween(prev.lastDate, todayDate);

  // Clock moved backwards (or crossed International Date Line westward):
  // Never break or double-increment the user's streak.
  if (diffFromLastDate < 0) {
    const runsToday = prev.runsToday + 1;
    const activeSecondsToday = roundTenths(prev.activeSecondsToday + addSec);
    return {
      ...prev,
      runsToday,
      activeSecondsToday,
      goalMetToday:
        prev.goalMetToday ||
        isGoalMet(runsToday, activeSecondsToday, prev.goalType, prev.goalTarget),
    };
  }

  const sameDay = diffFromLastDate === 0;
  const runsToday = sameDay ? prev.runsToday + 1 : 1;
  const activeSecondsToday = roundTenths((sameDay ? prev.activeSecondsToday : 0) + addSec);

  let streak = prev.streak;
  let lastFreezeUsedDate = prev.lastFreezeUsedDate;
  let lastGoalMetDate = prev.lastGoalMetDate;
  let previousGoalMetDate = prev.previousGoalMetDate ?? null;

  if (lastGoalMetDate) {
    const gapSinceMet = daysBetween(lastGoalMetDate, todayDate);
    if (gapSinceMet === 2) {
      const missedDate = addDays(lastGoalMetDate, 1);
      if (canUseFreezeForDay(lastFreezeUsedDate, missedDate, prev.freezeEnabled)) {
        lastFreezeUsedDate = missedDate;
      } else {
        streak = 0;
      }
    } else if (gapSinceMet > 2) {
      streak = 0;
    }
  } else {
    streak = 0;
  }

  const metNow = isGoalMet(runsToday, activeSecondsToday, prev.goalType, prev.goalTarget);
  if (metNow && lastGoalMetDate !== todayDate) {
    previousGoalMetDate = lastGoalMetDate;
    lastGoalMetDate = todayDate;
    streak += 1;
  }

  const longestStreak = Math.max(prev.longestStreak, streak);

  return {
    lastDate: todayDate,
    streak,
    longestStreak,
    runsToday,
    activeSecondsToday,
    goalMetToday: metNow,
    lastGoalMetDate,
    previousGoalMetDate,
    goalType: prev.goalType,
    goalTarget: prev.goalTarget,
    freezeEnabled: prev.freezeEnabled,
    lastFreezeUsedDate,
  };
}

export function updateDailyGoalConfig(
  state: DailyState | null,
  patch: Partial<DailyGoalConfig>,
  todayDate: string,
): DailyState {
  const prev = (state ? sanitizeDailyState(state) : null) ?? createEmptyDailyState(todayDate);
  const nextGoalType: GoalType = patch.goalType ?? prev.goalType;
  const targetInput =
    patch.goalTarget !== undefined
      ? patch.goalTarget
      : patch.goalType !== undefined && patch.goalType !== prev.goalType
        ? nextGoalType === "minutes"
          ? DEFAULT_GOAL_MINUTES
          : DEFAULT_GOAL_RUNS
        : prev.goalTarget;
  const nextGoalTarget = sanitizeGoalTarget(nextGoalType, targetInput);
  const nextFreezeEnabled = patch.freezeEnabled ?? prev.freezeEnabled;

  const isSameDay = daysBetween(prev.lastDate, todayDate) === 0;
  const runsToday = isSameDay ? prev.runsToday : 0;
  const activeSecondsToday = isSameDay ? prev.activeSecondsToday : 0;

  let streak = prev.streak;
  let lastGoalMetDate = prev.lastGoalMetDate;
  let previousGoalMetDate = prev.previousGoalMetDate ?? null;
  const lastFreezeUsedDate = prev.lastFreezeUsedDate;

  if (lastGoalMetDate && daysBetween(lastGoalMetDate, todayDate) > 0) {
    const gap = daysBetween(lastGoalMetDate, todayDate);
    if (gap === 2) {
      const missedDate = addDays(lastGoalMetDate, 1);
      if (!canUseFreezeForDay(lastFreezeUsedDate, missedDate, nextFreezeEnabled)) {
        streak = 0;
      }
    } else if (gap > 2) {
      streak = 0;
    }
  }

  const metNow = isGoalMet(runsToday, activeSecondsToday, nextGoalType, nextGoalTarget);
  if (isSameDay) {
    if (metNow && lastGoalMetDate !== todayDate) {
      previousGoalMetDate = lastGoalMetDate;
      lastGoalMetDate = todayDate;
      streak += 1;
    } else if (!metNow && lastGoalMetDate === todayDate) {
      streak = Math.max(0, streak - 1);
      lastGoalMetDate = previousGoalMetDate;
      previousGoalMetDate = null;
    }
  }

  return {
    lastDate: isSameDay ? prev.lastDate : todayDate,
    streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    runsToday,
    activeSecondsToday,
    goalMetToday: isSameDay ? metNow : false,
    lastGoalMetDate,
    previousGoalMetDate,
    goalType: nextGoalType,
    goalTarget: nextGoalTarget,
    freezeEnabled: nextFreezeEnabled,
    lastFreezeUsedDate,
  };
}

export function getEffectiveDaily(state: DailyState | null, todayDate: string): EffectiveDaily {
  const clean = state ? sanitizeDailyState(state) : null;
  if (!clean) {
    return {
      ...DEFAULT_DAILY_GOAL_CONFIG,
      streak: 0,
      longestStreak: 0,
      runsToday: 0,
      activeSecondsToday: 0,
      minutesToday: 0,
      goalMetToday: false,
      freezeAvailable: true,
      freezeActive: false,
      progressPercent: 0,
    };
  }

  const diffFromLastDate = daysBetween(clean.lastDate, todayDate);
  const sameDay = diffFromLastDate === 0;
  const runsToday = sameDay ? clean.runsToday : 0;
  const activeSecondsToday = sameDay ? clean.activeSecondsToday : 0;
  const minutesToday = Math.floor(activeSecondsToday / 60);
  const goalMetToday = sameDay
    ? clean.goalMetToday ||
      isGoalMet(runsToday, activeSecondsToday, clean.goalType, clean.goalTarget)
    : clean.lastGoalMetDate === todayDate;

  let streak = clean.streak;
  let freezeActive = false;

  if (clean.lastGoalMetDate) {
    const gapSinceMet = daysBetween(clean.lastGoalMetDate, todayDate);
    if (gapSinceMet === 0 || gapSinceMet === 1) {
      streak = clean.streak;
    } else if (gapSinceMet === 2) {
      const missedDate = addDays(clean.lastGoalMetDate, 1);
      if (canUseFreezeForDay(clean.lastFreezeUsedDate, missedDate, clean.freezeEnabled)) {
        streak = clean.streak;
        freezeActive = true;
      } else {
        streak = 0;
      }
    } else if (gapSinceMet > 2) {
      streak = 0;
    } else {
      // Clock moved backwards (gapSinceMet < 0): preserve current streak
      streak = clean.streak;
    }
  } else {
    streak = 0;
  }

  const freezeAvailable =
    clean.freezeEnabled &&
    !freezeActive &&
    (!clean.lastFreezeUsedDate ||
      daysBetween(clean.lastFreezeUsedDate, todayDate) >= FREEZE_COOLDOWN_DAYS);

  const progressRatio =
    clean.goalType === "minutes"
      ? activeSecondsToday / Math.max(1, clean.goalTarget * 60)
      : runsToday / Math.max(1, clean.goalTarget);

  return {
    streak,
    longestStreak: Math.max(clean.longestStreak, streak),
    runsToday,
    activeSecondsToday,
    minutesToday,
    goalType: clean.goalType,
    goalTarget: clean.goalTarget,
    goalMetToday,
    freezeEnabled: clean.freezeEnabled,
    freezeAvailable,
    freezeActive,
    progressPercent: Math.min(100, Math.round(progressRatio * 100)),
  };
}

export function loadDaily(): DailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return null;
    return sanitizeDailyState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDaily(state: DailyState): void {
  if (typeof window === "undefined") return;
  const clean = sanitizeDailyState(state);
  if (!clean) return;
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // silent storage fallback
  }
}

export async function loadDailyFromStorage(storage: Storage): Promise<DailyState | null> {
  try {
    const raw = await storage.get(DAILY_STORAGE_KEY);
    if (raw === null) return null;
    return sanitizeDailyState(raw);
  } catch {
    return null;
  }
}

export async function saveDailyToStorage(storage: Storage, state: DailyState): Promise<void> {
  const clean = sanitizeDailyState(state);
  if (!clean) return;
  try {
    await storage.set(DAILY_STORAGE_KEY, clean);
  } catch {
    // silent storage fallback
  }
}
