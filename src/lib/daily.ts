import { z } from "./zodSetup";
import type { Storage } from "./storage";

export interface DailyGoalConfig {
  goalTarget: number;
}

export interface DailyState extends DailyGoalConfig {
  lastDate: string; // "YYYY-MM-DD"
  streak: number;
  longestStreak: number;
  activeSecondsToday: number;
  goalMetToday: boolean;
  lastGoalMetDate: string | null;
  previousGoalMetDate?: string | null | undefined;
}

export interface EffectiveDaily extends DailyGoalConfig {
  streak: number;
  longestStreak: number;
  activeSecondsToday: number;
  minutesToday: number;
  goalMetToday: boolean;
  progressPercent: number;
}

export const DAILY_STORAGE_KEY = "ttp:daily:v1";
export const DEFAULT_GOAL_MINUTES = 5;
export const MAX_GOAL_MINUTES = 120;
export const DEFAULT_DAILY_GOAL_CONFIG: DailyGoalConfig = { goalTarget: DEFAULT_GOAL_MINUTES };

export const DailyGoalConfigSchema = z.object({
  goalTarget: z.number().finite().optional(),
});

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const DailyStateSchema = z.object({
  lastDate: DateStringSchema,
  streak: z.number().int().min(0),
  longestStreak: z.number().int().min(0).optional(),
  activeSecondsToday: z.number().finite().min(0).optional(),
  goalMetToday: z.boolean().optional(),
  lastGoalMetDate: DateStringSchema.nullable().optional(),
  previousGoalMetDate: DateStringSchema.nullable().optional(),
  goalType: z.enum(["minutes", "runs"]).optional(),
  goalTarget: z.number().finite().optional(),
});

const roundTenths = (n: number): number => Math.round(Math.max(0, n) * 10) / 10;
const isGoalMet = (activeSeconds: number, goalMinutes: number): boolean =>
  activeSeconds >= goalMinutes * 60;

export function sanitizeGoalTarget(rawTarget: unknown): number {
  if (typeof rawTarget !== "number" || !Number.isFinite(rawTarget)) return DEFAULT_GOAL_MINUTES;
  return Math.min(MAX_GOAL_MINUTES, Math.max(1, Math.round(rawTarget)));
}

const toUtcMs = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export function daysBetween(dateA: string, dateB: string): number {
  return Math.round((toUtcMs(dateB) - toUtcMs(dateA)) / 86_400_000);
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

export function addDays(dateStr: string, days: number): string {
  const dt = new Date(toUtcMs(dateStr) + days * 86_400_000);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function getLocalDateString(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function sanitizeDailyState(raw: unknown): DailyState | null {
  const parsed = DailyStateSchema.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;
  const isLegacyV1 = [
    d.goalType,
    d.goalTarget,
    d.goalMetToday,
    d.activeSecondsToday,
    d.lastGoalMetDate,
  ].every((v) => v === undefined);
  const hadRunsGoal = d.goalType === "runs" || isLegacyV1;
  const goalTarget = hadRunsGoal ? DEFAULT_GOAL_MINUTES : sanitizeGoalTarget(d.goalTarget);
  const activeSecondsToday = roundTenths(d.activeSecondsToday ?? 0);
  const goalMetToday = hadRunsGoal
    ? isGoalMet(activeSecondsToday, goalTarget)
    : (d.goalMetToday ?? isGoalMet(activeSecondsToday, goalTarget));
  const lastGoalMetDate =
    d.lastGoalMetDate !== undefined
      ? d.lastGoalMetDate
      : goalMetToday
        ? d.lastDate
        : d.streak > 0
          ? addDays(d.lastDate, -1)
          : null;

  return {
    lastDate: d.lastDate,
    streak: d.streak,
    longestStreak: Math.max(d.longestStreak ?? 0, d.streak),
    activeSecondsToday,
    goalMetToday,
    lastGoalMetDate,
    previousGoalMetDate: d.previousGoalMetDate ?? null,
    goalTarget,
  };
}

const carryStreak = (prev: DailyState, todayDate: string): number =>
  prev.lastGoalMetDate && daysBetween(prev.lastGoalMetDate, todayDate) <= 1 ? prev.streak : 0;

const baseState = (state: DailyState | null, todayDate: string): DailyState =>
  (state ? sanitizeDailyState(state) : null) ??
  sanitizeDailyState({ lastDate: todayDate, streak: 0 })!;

function resolveDailyProgress(
  prev: DailyState,
  todayDate: string,
  lastDate: string,
  activeSecondsToday: number,
  goalTarget: number,
  metNow: boolean,
  allowUndo: boolean,
): DailyState {
  let streak = carryStreak(prev, todayDate);
  let lastGoalMetDate = prev.lastGoalMetDate;
  let previousGoalMetDate = prev.previousGoalMetDate ?? null;

  if (metNow && lastGoalMetDate !== todayDate) {
    previousGoalMetDate = lastGoalMetDate;
    lastGoalMetDate = todayDate;
    streak += 1;
  } else if (allowUndo && !metNow && lastGoalMetDate === todayDate) {
    streak = Math.max(0, streak - 1);
    lastGoalMetDate = previousGoalMetDate;
    previousGoalMetDate = null;
  }

  return {
    lastDate,
    streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    activeSecondsToday,
    goalMetToday: metNow,
    lastGoalMetDate,
    previousGoalMetDate,
    goalTarget,
  };
}

export function recordRunToday(
  state: DailyState | null,
  todayDate: string,
  activeSeconds = 0,
): DailyState {
  const prev = baseState(state, todayDate);
  const addSec = Number.isFinite(activeSeconds) ? roundTenths(activeSeconds) : 0;
  const diff = daysBetween(prev.lastDate, todayDate);

  if (diff < 0) {
    const secs = roundTenths(prev.activeSecondsToday + addSec);
    return {
      ...prev,
      activeSecondsToday: secs,
      goalMetToday: prev.goalMetToday || isGoalMet(secs, prev.goalTarget),
    };
  }

  const secs = roundTenths((diff === 0 ? prev.activeSecondsToday : 0) + addSec);
  const metNow = isGoalMet(secs, prev.goalTarget);
  return resolveDailyProgress(prev, todayDate, todayDate, secs, prev.goalTarget, metNow, false);
}

export function updateDailyGoalConfig(
  state: DailyState | null,
  patch: Partial<DailyGoalConfig>,
  todayDate: string,
): DailyState {
  const prev = baseState(state, todayDate);
  const goalTarget = sanitizeGoalTarget(patch.goalTarget ?? prev.goalTarget);
  const sameDay = daysBetween(prev.lastDate, todayDate) === 0;
  const secs = sameDay ? prev.activeSecondsToday : 0;
  const metNow = sameDay && isGoalMet(secs, goalTarget);
  const lastDate = sameDay ? prev.lastDate : todayDate;
  return resolveDailyProgress(prev, todayDate, lastDate, secs, goalTarget, metNow, sameDay);
}

export function getEffectiveDaily(state: DailyState | null, todayDate: string): EffectiveDaily {
  const clean = baseState(state, todayDate);
  const sameDay = daysBetween(clean.lastDate, todayDate) === 0;
  const activeSecondsToday = sameDay ? clean.activeSecondsToday : 0;
  const goalMetToday = sameDay
    ? clean.goalMetToday || isGoalMet(activeSecondsToday, clean.goalTarget)
    : clean.lastGoalMetDate === todayDate;
  const streak = carryStreak(clean, todayDate);

  return {
    streak,
    longestStreak: Math.max(clean.longestStreak, streak),
    activeSecondsToday,
    minutesToday: Math.floor(activeSecondsToday / 60),
    goalTarget: clean.goalTarget,
    goalMetToday,
    progressPercent: Math.min(
      100,
      Math.round((activeSecondsToday / Math.max(1, clean.goalTarget * 60)) * 100),
    ),
  };
}

export async function loadDailyFromStorage(storage: Storage): Promise<DailyState | null> {
  try {
    const raw = await storage.get(DAILY_STORAGE_KEY);
    return raw === null ? null : sanitizeDailyState(raw);
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
