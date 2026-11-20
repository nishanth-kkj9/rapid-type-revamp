import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  DEFAULT_DAILY_GOAL_CONFIG,
  getEffectiveDaily,
  getLocalDateString,
  loadDailyFromStorage,
  recordRunToday,
  sanitizeDailyState,
  saveDailyToStorage,
  updateDailyGoalConfig,
  DAILY_STORAGE_KEY,
  type DailyState,
} from "./daily";
import { MemoryStorage } from "./storage";

const makeState = (over: Partial<DailyState> = {}): DailyState => ({
  lastDate: "2026-09-20",
  streak: 0,
  longestStreak: 0,
  runsToday: 0,
  activeSecondsToday: 0,
  goalMetToday: false,
  lastGoalMetDate: null,
  previousGoalMetDate: null,
  ...DEFAULT_DAILY_GOAL_CONFIG,
  lastFreezeUsedDate: null,
  ...over,
});

describe("daily goal v2 & streak v2", () => {
  it("1. first day: counts streak = 1 immediately the moment the goal is met", () => {
    // 2 minutes practiced -> goal (5m default) not yet met -> streak 0
    const partial = recordRunToday(null, "2026-09-20", 120);
    expect(partial.streak).toBe(0);
    expect(partial.goalMetToday).toBe(false);
    expect(partial.activeSecondsToday).toBe(120);
    expect(partial.runsToday).toBe(1);

    // Another 3 minutes on day 1 -> reaches 5 active minutes -> streak becomes 1 immediately!
    const completed = recordRunToday(partial, "2026-09-20", 180);
    expect(completed.streak).toBe(1);
    expect(completed.longestStreak).toBe(1);
    expect(completed.goalMetToday).toBe(true);
    expect(completed.lastGoalMetDate).toBe("2026-09-20");

    // Display selector reflects streak = 1 right away on day 1
    const eff = getEffectiveDaily(completed, "2026-09-20");
    expect(eff.streak).toBe(1);
    expect(eff.longestStreak).toBe(1);
    expect(eff.goalMetToday).toBe(true);
    expect(eff.minutesToday).toBe(5);
    expect(eff.progressPercent).toBe(100);
  });

  it("2. same-day repeats: accumulates runs/active time without double-incrementing streak", () => {
    const s1 = recordRunToday(null, "2026-09-20", 310);
    expect(s1.streak).toBe(1);
    expect(s1.runsToday).toBe(1);

    const s2 = recordRunToday(s1, "2026-09-20", 90);
    expect(s2.streak).toBe(1);
    expect(s2.longestStreak).toBe(1);
    expect(s2.runsToday).toBe(2);
    expect(s2.activeSecondsToday).toBe(400);

    const s3 = recordRunToday(s2, "2026-09-20", 60);
    expect(s3.streak).toBe(1);
    expect(s3.runsToday).toBe(3);
    expect(s3.activeSecondsToday).toBe(460);
  });

  it("3. next day: preserves streak before first run and increments immediately when goal met", () => {
    const day1 = recordRunToday(null, "2026-09-20", 300);
    expect(day1.streak).toBe(1);

    // Morning of Day 2 before any run: yesterday's 1-day streak is still alive
    const day2Morning = getEffectiveDaily(day1, "2026-09-21");
    expect(day2Morning.streak).toBe(1);
    expect(day2Morning.runsToday).toBe(0);
    expect(day2Morning.activeSecondsToday).toBe(0);
    expect(day2Morning.goalMetToday).toBe(false);

    // Partial run on Day 2 keeps streak at 1 until today's goal is reached
    const day2Partial = recordRunToday(day1, "2026-09-21", 120);
    expect(day2Partial.streak).toBe(1);
    expect(day2Partial.goalMetToday).toBe(false);

    // Finishing Day 2's goal bumps streak immediately to 2
    const day2Done = recordRunToday(day2Partial, "2026-09-21", 180);
    expect(day2Done.streak).toBe(2);
    expect(day2Done.longestStreak).toBe(2);
    expect(day2Done.lastGoalMetDate).toBe("2026-09-21");
  });

  it("4. gap handling: resets on missed day without freeze, and forgives 1 missed day per 7 days with freeze", () => {
    // Freeze disabled: meeting Day 1, missing Day 2, returning Day 3 resets streak
    const day1NoFreeze = recordRunToday(
      makeState({
        goalType: "runs",
        goalTarget: 2,
        freezeEnabled: false,
      }),
      "2026-09-20",
      60,
    );
    const day1Met = recordRunToday(day1NoFreeze, "2026-09-20", 60);
    expect(day1Met.streak).toBe(1);

    expect(getEffectiveDaily(day1Met, "2026-09-22").streak).toBe(0);
    const day3Partial = recordRunToday(day1Met, "2026-09-22", 60);
    expect(day3Partial.streak).toBe(0);
    expect(day3Partial.longestStreak).toBe(1);

    // Freeze enabled: Day 1 & Day 2 met (streak 2), Day 3 missed, return Day 4 -> freeze protects streak
    let s = recordRunToday(
      makeState({ goalType: "runs", goalTarget: 1, freezeEnabled: true }),
      "2026-09-20",
      60,
    );
    s = recordRunToday(s, "2026-09-21", 60);
    expect(s.streak).toBe(2);

    const effGapWithFreeze = getEffectiveDaily(s, "2026-09-23");
    expect(effGapWithFreeze.streak).toBe(2);
    expect(effGapWithFreeze.freezeActive).toBe(true);

    const day4Met = recordRunToday(s, "2026-09-23", 60);
    expect(day4Met.streak).toBe(3);
    expect(day4Met.longestStreak).toBe(3);
    expect(day4Met.lastFreezeUsedDate).toBe("2026-09-22");

    // Missing another day only 3 days later (within 7-day cooldown) -> cannot freeze again, streak resets!
    const effTooSoon = getEffectiveDaily(day4Met, "2026-09-25");
    expect(effTooSoon.streak).toBe(0);
    expect(effTooSoon.freezeAvailable).toBe(false);

    const afterCooldownFail = recordRunToday(day4Met, "2026-09-25", 60);
    expect(afterCooldownFail.streak).toBe(1); // fresh 1-day streak from meeting today's goal
    expect(afterCooldownFail.longestStreak).toBe(3); // longest preserved

    // Missing 2 consecutive days (>1 missed day) always resets even with freeze available
    const twoDayGap = getEffectiveDaily(s, "2026-09-24");
    expect(twoDayGap.streak).toBe(0);
  });

  it("5. timezone & DST changes: spring-forward and fall-back transitions count exact calendar days", () => {
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    // US Spring forward (2026-03-08) & Fall back (2026-11-01)
    expect(daysBetween("2026-03-07", "2026-03-08")).toBe(1);
    expect(daysBetween("2026-03-08", "2026-03-09")).toBe(1);
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysBetween("2026-11-01", "2026-11-02")).toBe(1);
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");

    let s = recordRunToday(
      makeState({ lastDate: "2026-03-06", goalType: "runs", goalTarget: 1 }),
      "2026-03-07",
      60,
    );
    s = recordRunToday(s, "2026-03-08", 60);
    s = recordRunToday(s, "2026-03-09", 60);
    expect(s.streak).toBe(3);

    // Fall back sequence
    let f = recordRunToday(
      makeState({ lastDate: "2026-10-30", goalType: "runs", goalTarget: 1 }),
      "2026-10-31",
      60,
    );
    f = recordRunToday(f, "2026-11-01", 60);
    f = recordRunToday(f, "2026-11-02", 60);
    expect(f.streak).toBe(3);

    const localSample = getLocalDateString(new Date(2026, 10, 1, 23, 55, 0));
    expect(localSample).toBe("2026-11-01");
  });

  it("6. clock moved backwards: preserves streak and longestStreak without corruption", () => {
    let s = recordRunToday(makeState({ goalType: "runs", goalTarget: 1 }), "2026-09-20", 60);
    s = recordRunToday(s, "2026-09-21", 60);
    expect(s.streak).toBe(2);

    // Clock suddenly jumps back 2 days to 2026-09-19
    const backwardsRun = recordRunToday(s, "2026-09-19", 90);
    expect(backwardsRun.streak).toBe(2);
    expect(backwardsRun.longestStreak).toBe(2);
    expect(backwardsRun.lastDate).toBe("2026-09-21");

    const effBackwards = getEffectiveDaily(s, "2026-09-19");
    expect(effBackwards.streak).toBe(2);
    expect(effBackwards.longestStreak).toBe(2);
  });

  it("supports switching goal config between active minutes and runs dynamically", () => {
    const partial = recordRunToday(null, "2026-09-20", 150); // 2.5 minutes, 1 run
    expect(partial.streak).toBe(0);

    // Lower target to 2 minutes -> goal becomes met today immediately
    const lowered = updateDailyGoalConfig(partial, { goalTarget: 2 }, "2026-09-20");
    expect(lowered.goalMetToday).toBe(true);
    expect(lowered.streak).toBe(1);

    // Raise target to 5 minutes -> un-credits today's newly added point cleanly
    const raised = updateDailyGoalConfig(lowered, { goalTarget: 5 }, "2026-09-20");
    expect(raised.goalMetToday).toBe(false);
    expect(raised.streak).toBe(0);

    // Switch to runs mode with target 1 -> met immediately
    const asRuns = updateDailyGoalConfig(raised, { goalType: "runs", goalTarget: 1 }, "2026-09-20");
    expect(asRuns.goalType).toBe("runs");
    expect(asRuns.goalTarget).toBe(1);
    expect(asRuns.goalMetToday).toBe(true);
    expect(asRuns.streak).toBe(1);
  });

  it("migrates legacy v1 daily payloads and rejects corrupted/NaN payloads safely", async () => {
    const legacyIncomplete = sanitizeDailyState({
      lastDate: "2026-09-20",
      streak: 5,
      runsToday: 2,
    });
    expect(legacyIncomplete?.streak).toBe(5);
    expect(legacyIncomplete?.goalType).toBe("runs");
    expect(legacyIncomplete?.goalMetToday).toBe(false);

    const legacyComplete = sanitizeDailyState({ lastDate: "2026-09-20", streak: 3, runsToday: 3 });
    expect(legacyComplete?.streak).toBe(4);
    expect(legacyComplete?.goalMetToday).toBe(true);

    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: null, runsToday: 1 })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: 2.5, runsToday: 1 })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "2026-09-21", streak: -3, runsToday: 1 })).toBeNull();
    expect(sanitizeDailyState({ lastDate: "not-a-date", streak: 2, runsToday: 1 })).toBeNull();

    const storage = new MemoryStorage();
    await saveDailyToStorage(storage, legacyComplete!);
    expect(await loadDailyFromStorage(storage)).toEqual(legacyComplete);

    await storage.set(DAILY_STORAGE_KEY, { lastDate: "not-a-date", streak: 2, runsToday: 1 });
    expect(await loadDailyFromStorage(storage)).toBeNull();
  });
});
