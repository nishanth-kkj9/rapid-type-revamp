import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  DAILY_STORAGE_KEY,
  DEFAULT_DAILY_GOAL_CONFIG,
  DEFAULT_GOAL_MINUTES,
  getEffectiveDaily,
  getLocalDateString,
  loadDailyFromStorage,
  recordRunToday,
  sanitizeDailyState,
  sanitizeGoalTarget,
  saveDailyToStorage,
  updateDailyGoalConfig,
  type DailyState,
} from "./daily";
import { MemoryStorage } from "./storage";

const makeState = (over: Partial<DailyState> = {}): DailyState => ({
  lastDate: "2026-09-20",
  streak: 0,
  longestStreak: 0,
  activeSecondsToday: 0,
  goalMetToday: false,
  lastGoalMetDate: null,
  previousGoalMetDate: null,
  ...DEFAULT_DAILY_GOAL_CONFIG,
  ...over,
});

describe("daily goal (minutes) & streak", () => {
  it("1. first day: counts streak = 1 immediately when active minutes reach target", () => {
    const partial = recordRunToday(null, "2026-09-20", 120);
    expect(partial.streak).toBe(0);
    expect(partial.goalMetToday).toBe(false);
    expect(partial.activeSecondsToday).toBe(120);

    const completed = recordRunToday(partial, "2026-09-20", 180);
    expect(completed.streak).toBe(1);
    expect(completed.longestStreak).toBe(1);
    expect(completed.goalMetToday).toBe(true);
    expect(completed.lastGoalMetDate).toBe("2026-09-20");

    const eff = getEffectiveDaily(completed, "2026-09-20");
    expect(eff.streak).toBe(1);
    expect(eff.longestStreak).toBe(1);
    expect(eff.goalMetToday).toBe(true);
    expect(eff.minutesToday).toBe(5);
    expect(eff.progressPercent).toBe(100);
  });

  it("2. same-day repeats: accumulates active seconds without double-incrementing streak", () => {
    const s1 = recordRunToday(null, "2026-09-20", 310);
    expect(s1.streak).toBe(1);

    const s2 = recordRunToday(s1, "2026-09-20", 90);
    expect(s2.streak).toBe(1);
    expect(s2.longestStreak).toBe(1);
    expect(s2.activeSecondsToday).toBe(400);

    const s3 = recordRunToday(s2, "2026-09-20", 60);
    expect(s3.streak).toBe(1);
    expect(s3.activeSecondsToday).toBe(460);
  });

  it("3. next day: preserves streak before first run and increments immediately when goal met", () => {
    const day1 = recordRunToday(null, "2026-09-20", 300);
    expect(day1.streak).toBe(1);

    const day2Morning = getEffectiveDaily(day1, "2026-09-21");
    expect(day2Morning.streak).toBe(1);
    expect(day2Morning.activeSecondsToday).toBe(0);
    expect(day2Morning.goalMetToday).toBe(false);

    const day2Partial = recordRunToday(day1, "2026-09-21", 120);
    expect(day2Partial.streak).toBe(1);
    expect(day2Partial.goalMetToday).toBe(false);

    const day2Done = recordRunToday(day2Partial, "2026-09-21", 180);
    expect(day2Done.streak).toBe(2);
    expect(day2Done.longestStreak).toBe(2);
    expect(day2Done.lastGoalMetDate).toBe("2026-09-21");
  });

  it("4. gap handling: missing a calendar day resets streak cleanly while preserving longestStreak", () => {
    let s = recordRunToday(makeState({ goalTarget: 1 }), "2026-09-20", 60);
    s = recordRunToday(s, "2026-09-21", 60);
    expect(s.streak).toBe(2);

    // Skipped 2026-09-22 -> on 2026-09-23 streak is 0
    expect(getEffectiveDaily(s, "2026-09-23").streak).toBe(0);

    const partial = recordRunToday(s, "2026-09-23", 30);
    expect(partial.streak).toBe(0);
    expect(partial.longestStreak).toBe(2);

    const restarted = recordRunToday(partial, "2026-09-23", 30);
    expect(restarted.streak).toBe(1);
    expect(restarted.longestStreak).toBe(2);
  });

  it("5. timezone & DST changes: spring-forward and fall-back transitions count exact calendar days", () => {
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(daysBetween("2026-03-08", "2026-03-09")).toBe(1);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1);
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");

    let s = recordRunToday(makeState({ lastDate: "2026-03-06", goalTarget: 1 }), "2026-03-07", 60);
    s = recordRunToday(s, "2026-03-08", 60);
    s = recordRunToday(s, "2026-03-09", 60);
    expect(s.streak).toBe(3);

    let f = recordRunToday(makeState({ lastDate: "2026-10-30", goalTarget: 1 }), "2026-10-31", 60);
    f = recordRunToday(f, "2026-11-01", 60);
    f = recordRunToday(f, "2026-11-02", 60);
    expect(f.streak).toBe(3);

    const localSample = getLocalDateString(new Date(2026, 10, 1, 23, 55, 0));
    expect(localSample).toBe("2026-11-01");
  });

  it("6. clock moved backwards: preserves streak and longestStreak without corruption", () => {
    let s = recordRunToday(makeState({ goalTarget: 1 }), "2026-09-20", 60);
    s = recordRunToday(s, "2026-09-21", 60);
    expect(s.streak).toBe(2);

    const backwardsRun = recordRunToday(s, "2026-09-19", 90);
    expect(backwardsRun.streak).toBe(2);
    expect(backwardsRun.longestStreak).toBe(2);
    expect(backwardsRun.lastDate).toBe("2026-09-21");

    const effBackwards = getEffectiveDaily(s, "2026-09-19");
    expect(effBackwards.streak).toBe(2);
    expect(effBackwards.longestStreak).toBe(2);
  });

  it("7. updates daily minutes goal (1..120) and re-evaluates today's goalMetToday cleanly", () => {
    expect(sanitizeGoalTarget(0)).toBe(1);
    expect(sanitizeGoalTarget(200)).toBe(120);
    expect(sanitizeGoalTarget(Number.NaN)).toBe(DEFAULT_GOAL_MINUTES);

    const partial = recordRunToday(null, "2026-09-20", 150); // 2.5 minutes
    expect(partial.streak).toBe(0);

    const lowered = updateDailyGoalConfig(partial, { goalTarget: 2 }, "2026-09-20");
    expect(lowered.goalMetToday).toBe(true);
    expect(lowered.streak).toBe(1);

    const raised = updateDailyGoalConfig(lowered, { goalTarget: 5 }, "2026-09-20");
    expect(raised.goalMetToday).toBe(false);
    expect(raised.streak).toBe(0);
  });

  it("8. converts old saved daily state with runs goal or freezes to minutes default while keeping streak", async () => {
    const oldRunsAndFreeze = sanitizeDailyState({
      lastDate: "2026-09-20",
      streak: 7,
      longestStreak: 12,
      runsToday: 3,
      activeSecondsToday: 95,
      goalMetToday: true,
      lastGoalMetDate: "2026-09-20",
      goalType: "runs",
      goalTarget: 3,
      freezeEnabled: true,
      lastFreezeUsedDate: "2026-09-18",
    });
    expect(oldRunsAndFreeze).not.toBeNull();
    expect(oldRunsAndFreeze?.goalTarget).toBe(DEFAULT_GOAL_MINUTES);
    expect(oldRunsAndFreeze?.streak).toBe(7);
    expect(oldRunsAndFreeze?.longestStreak).toBe(12);
    expect(oldRunsAndFreeze?.activeSecondsToday).toBe(95);
    expect(oldRunsAndFreeze?.goalMetToday).toBe(false);
    expect("goalType" in oldRunsAndFreeze!).toBe(false);
    expect("freezeEnabled" in oldRunsAndFreeze!).toBe(false);
    expect("runsToday" in oldRunsAndFreeze!).toBe(false);

    const effRuns = getEffectiveDaily(oldRunsAndFreeze, "2026-09-20");
    expect(effRuns.streak).toBe(7);
    expect(effRuns.goalTarget).toBe(DEFAULT_GOAL_MINUTES);

    // Old minutes goal with freeze fields keeps custom minutes target & streak
    const oldMinutesWithFreeze = sanitizeDailyState({
      lastDate: "2026-09-20",
      streak: 4,
      runsToday: 1,
      activeSecondsToday: 600,
      goalMetToday: true,
      lastGoalMetDate: "2026-09-20",
      goalType: "minutes",
      goalTarget: 10,
      freezeEnabled: false,
      lastFreezeUsedDate: null,
    });
    expect(oldMinutesWithFreeze?.goalTarget).toBe(10);
    expect(oldMinutesWithFreeze?.streak).toBe(4);
    expect(oldMinutesWithFreeze?.goalMetToday).toBe(true);

    // Legacy v1 payload without goalType/activeSecondsToday/lastGoalMetDate
    const legacyV1 = sanitizeDailyState({
      lastDate: "2026-09-20",
      streak: 5,
      runsToday: 3,
    });
    expect(legacyV1?.streak).toBe(5);
    expect(legacyV1?.goalTarget).toBe(DEFAULT_GOAL_MINUTES);
    expect(legacyV1?.goalMetToday).toBe(false);
    expect(legacyV1?.lastGoalMetDate).toBe("2026-09-19");
    expect(getEffectiveDaily(legacyV1, "2026-09-20").streak).toBe(5);

    // Rejects corrupted payloads safely
    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: null })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: 2.5 })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: -3 })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "not-a-date", streak: 2 })).toBeNull();

    const storage = new MemoryStorage();
    await saveDailyToStorage(storage, oldMinutesWithFreeze!);
    expect(await loadDailyFromStorage(storage)).toEqual(oldMinutesWithFreeze);

    await storage.set(DAILY_STORAGE_KEY, { lastDate: "not-a-date", streak: 2 });
    expect(await loadDailyFromStorage(storage)).toBeNull();
  });
});
