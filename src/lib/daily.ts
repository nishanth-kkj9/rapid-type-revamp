export interface DailyState {
  lastDate: string; // "YYYY-MM-DD"
  streak: number;
  runsToday: number;
}

export const DAILY_STORAGE_KEY = "ttp:daily:v1";
export const DAILY_GOAL = 3; // runs per day, across both modes, to keep the streak

export function daysBetween(dateA: string, dateB: string): number {
  const [y1, m1, d1] = dateA.split("-").map(Number);
  const [y2, m2, d2] = dateB.split("-").map(Number);
  const utc1 = Date.UTC(y1 ?? 0, (m1 ?? 1) - 1, d1 ?? 1);
  const utc2 = Date.UTC(y2 ?? 0, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function recordRunToday(state: DailyState | null, todayDate: string): DailyState {
  if (!state) {
    return {
      lastDate: todayDate,
      streak: 0,
      runsToday: 1,
    };
  }

  const diff = daysBetween(state.lastDate, todayDate);

  if (diff === 0) {
    return {
      ...state,
      runsToday: state.runsToday + 1,
    };
  }

  if (diff === 1) {
    return {
      lastDate: todayDate,
      streak: state.runsToday >= 3 ? state.streak + 1 : 0,
      runsToday: 1,
    };
  }

  return {
    lastDate: todayDate,
    streak: 0,
    runsToday: 1,
  };
}

export function getEffectiveDaily(
  state: DailyState | null,
  todayDate: string,
): { streak: number; runsToday: number } {
  if (!state) {
    return { streak: 0, runsToday: 0 };
  }

  const diff = daysBetween(state.lastDate, todayDate);

  if (diff === 0) {
    return { streak: state.streak, runsToday: state.runsToday };
  }

  if (diff === 1) {
    return {
      streak: state.runsToday >= 3 ? state.streak + 1 : 0,
      runsToday: 0,
    };
  }

  return { streak: 0, runsToday: 0 };
}

export function loadDaily(): DailyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
    if (
      parsed &&
      typeof parsed.lastDate === "string" &&
      ISO_DATE.test(parsed.lastDate) &&
      Number.isInteger(parsed.streak) &&
      Number.isInteger(parsed.runsToday) &&
      (parsed.streak as number) >= 0 &&
      (parsed.runsToday as number) >= 0
    ) {
      return parsed as DailyState;
    }
  } catch {
    // silent storage fallback
  }
  return null;
}

export function saveDaily(state: DailyState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silent storage fallback
  }
}
