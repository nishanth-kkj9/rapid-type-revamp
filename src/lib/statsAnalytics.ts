import { getLocalDateString, addDays, daysBetween } from "./daily";
import { getShooterBestScore, normalizeModeKey, type HistoryEntry } from "./typingStats";

export interface StatsSummary {
  totalRuns: number;
  drillRuns: number;
  shooterRuns: number;
  totalElapsedSec: number;
  bestWpm: number;
  avgAccuracyLast20: number | null;
}

export function isLearnMode(mode: string): boolean {
  const norm = normalizeModeKey(mode);
  return norm === "learn" || norm.startsWith("learn-") || norm.startsWith("learn:");
}

export function computeStatsSummary(history: readonly HistoryEntry[]): StatsSummary {
  if (history.length === 0) {
    return {
      totalRuns: 0,
      drillRuns: 0,
      shooterRuns: 0,
      totalElapsedSec: 0,
      bestWpm: 0,
      avgAccuracyLast20: null,
    };
  }

  let drillRuns = 0;
  let shooterRuns = 0;
  let totalElapsedSec = 0;
  let bestWpm = 0;

  for (const h of history) {
    const mode = normalizeModeKey(h.mode);
    if (mode === "shooter") {
      shooterRuns += 1;
    } else {
      drillRuns += 1;
      if (!h.repeated && !isLearnMode(mode) && h.wpm > bestWpm) {
        bestWpm = h.wpm;
      }
    }
    if (Number.isFinite(h.elapsed) && h.elapsed > 0) {
      totalElapsedSec += h.elapsed;
    }
  }

  const sortedRecent = [...history].sort((a, b) => b.date - a.date).slice(0, 20);
  const accSum = sortedRecent.reduce((sum, h) => sum + h.accuracy, 0);
  const avgAccuracyLast20 =
    sortedRecent.length > 0 ? Math.round((accSum / sortedRecent.length) * 10) / 10 : null;

  return {
    totalRuns: history.length,
    drillRuns,
    shooterRuns,
    totalElapsedSec: Math.round(totalElapsedSec),
    bestWpm: Math.round(bestWpm),
    avgAccuracyLast20,
  };
}

export interface ArcadePersonalBests {
  totalGames: number;
  bestScore: number;
  bestLevel: number;
  bestStreak: number;
  bossesDefeated: number;
}

export function computeArcadePersonalBests(history: readonly HistoryEntry[]): ArcadePersonalBests {
  const shooterRuns = history.filter((h) => normalizeModeKey(h.mode) === "shooter");
  if (shooterRuns.length === 0) {
    return {
      totalGames: 0,
      bestScore: 0,
      bestLevel: 0,
      bestStreak: 0,
      bossesDefeated: 0,
    };
  }

  let bestLevel = 0;
  let bestStreak = 0;
  let bossesDefeated = 0;
  for (const run of shooterRuns) {
    bestLevel = Math.max(bestLevel, run.level ?? 1);
    bestStreak = Math.max(bestStreak, run.maxStreak ?? 0);
    bossesDefeated += Math.max(0, run.bossesDefeated ?? 0);
  }

  return {
    totalGames: shooterRuns.length,
    bestScore: getShooterBestScore(shooterRuns),
    bestLevel,
    bestStreak,
    bossesDefeated,
  };
}

export function formatTotalDuration(totalSeconds: number): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export type ActivityMetric = "runs" | "minutes";

export interface ActivityDayCell {
  date: string;
  runs: number;
  seconds: number;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
  col: number;
  row: number;
  isFuture: boolean;
}

export interface ActivityCalendarData {
  weeks: ActivityDayCell[][];
  flatDays: ActivityDayCell[];
  totalRuns: number;
  totalMinutes: number;
  activeDays: number;
  startDate: string;
  endDate: string;
  monthLabels: { col: number; label: string }[];
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function weekdaySunZero(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

function intensityLevel(value: number, maxValue: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || maxValue <= 0) return 0;
  const ratio = value / maxValue;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/**
 * Build a 26-week Sunday-to-Saturday activity calendar ending on `todayDate` (local YYYY-MM-DD).
 * Day counts and active minutes come directly from history entries' local calendar dates.
 */
export function buildActivityCalendar(
  history: readonly HistoryEntry[],
  metric: ActivityMetric = "runs",
  todayDate = getLocalDateString(),
  numWeeks = 26,
): ActivityCalendarData {
  const safeWeeks = Math.max(1, Math.min(52, Math.round(numWeeks)));
  const todayDow = weekdaySunZero(todayDate);
  const totalOffsetDays = (safeWeeks - 1) * 7 + todayDow;
  const startDate = addDays(todayDate, -totalOffsetDays);

  const byDate = new Map<string, { runs: number; seconds: number }>();
  for (const h of history) {
    if (!Number.isFinite(h.date) || h.date <= 0) continue;
    const dayStr = getLocalDateString(new Date(h.date));
    if (daysBetween(startDate, dayStr) < 0 || daysBetween(dayStr, todayDate) < 0) continue;
    const prev = byDate.get(dayStr);
    const sec = Number.isFinite(h.elapsed) && h.elapsed > 0 ? h.elapsed : 0;
    if (prev) {
      prev.runs += 1;
      prev.seconds += sec;
    } else {
      byDate.set(dayStr, { runs: 1, seconds: sec });
    }
  }

  let maxVal = 0;
  for (const rec of byDate.values()) {
    const val = metric === "runs" ? rec.runs : rec.seconds / 60;
    if (val > maxVal) maxVal = val;
  }

  const weeks: ActivityDayCell[][] = [];
  const flatDays: ActivityDayCell[] = [];
  const monthLabels: { col: number; label: string }[] = [];
  let prevMonth = "";
  let totalRuns = 0;
  let totalSeconds = 0;
  let activeDays = 0;

  for (let col = 0; col < safeWeeks; col++) {
    const column: ActivityDayCell[] = [];
    for (let row = 0; row < 7; row++) {
      const date = addDays(startDate, col * 7 + row);
      const isFuture = daysBetween(todayDate, date) > 0;
      const rec = isFuture ? undefined : byDate.get(date);
      const runs = rec?.runs ?? 0;
      const seconds = rec?.seconds ?? 0;
      const minutes = Math.round((seconds / 60) * 10) / 10;
      const metricVal = metric === "runs" ? runs : seconds / 60;
      const level = isFuture ? 0 : intensityLevel(metricVal, maxVal);

      if (!isFuture && runs > 0) {
        totalRuns += runs;
        totalSeconds += seconds;
        activeDays += 1;
      }

      if (row === 0 && !isFuture) {
        const monthPart = date.slice(5, 7);
        if (monthPart !== prevMonth) {
          const monthIdx = Number(monthPart) - 1;
          monthLabels.push({ col, label: MONTH_SHORT[monthIdx] ?? monthPart });
          prevMonth = monthPart;
        }
      }

      const cell: ActivityDayCell = {
        date,
        runs,
        seconds,
        minutes,
        level,
        col,
        row,
        isFuture,
      };
      column.push(cell);
      if (!isFuture) {
        flatDays.push(cell);
      }
    }
    weeks.push(column);
  }

  return {
    weeks,
    flatDays,
    totalRuns,
    totalMinutes: Math.round((totalSeconds / 60) * 10) / 10,
    activeDays,
    startDate,
    endDate: todayDate,
    monthLabels,
  };
}

/** Keep chart rendering responsive on 2,000+ imported runs while preserving full chronological span. */
export function downsampleProgressPoints<T>(points: readonly T[], maxPoints = 120): T[] {
  if (points.length <= maxPoints || maxPoints < 2) return [...points];
  const result: T[] = [];
  const lastIdx = points.length - 1;
  const step = lastIdx / (maxPoints - 1);
  let lastPicked = -1;
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? lastIdx : Math.round(i * step);
    if (idx !== lastPicked && points[idx] !== undefined) {
      result.push(points[idx]!);
      lastPicked = idx;
    }
  }
  return result;
}
