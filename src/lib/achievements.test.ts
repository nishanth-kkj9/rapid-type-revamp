// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  clearAchievements,
  EMPTY_ACHIEVEMENTS,
  evaluateAchievements,
  loadAchievements,
  saveAchievements,
  ACHIEVEMENTS_KEY,
  type RunContext,
} from "./achievements";

const drillCtx = (over: Partial<RunContext> = {}): RunContext => ({
  mode: "drill",
  wpm: 30,
  accuracy: 90,
  typed: 60,
  ...over,
});

describe("achievements", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty state when storage is empty", () => {
    expect(loadAchievements()).toEqual(EMPTY_ACHIEVEMENTS);
  });

  it("any completed run unlocks first-run and persists via save/load", () => {
    const { state, newlyUnlocked } = evaluateAchievements(drillCtx(), EMPTY_ACHIEVEMENTS);
    expect(newlyUnlocked.map((a) => a.id)).toEqual(["first-run"]);
    saveAchievements(state);
    expect(loadAchievements().unlocked["first-run"]).toEqual(state.unlocked["first-run"]);
  });

  it("speed thresholds unlock cumulatively in evaluation order", () => {
    const { newlyUnlocked } = evaluateAchievements(drillCtx({ wpm: 100 }), EMPTY_ACHIEVEMENTS);
    expect(newlyUnlocked.map((a) => a.id)).toEqual([
      "speed-40",
      "speed-60",
      "speed-80",
      "speed-100",
      "first-run",
    ]);
  });

  it("flawless drill requires 50+ typed chars", () => {
    const low = evaluateAchievements(drillCtx({ accuracy: 100, typed: 49 }), EMPTY_ACHIEVEMENTS);
    expect(low.state.unlocked["flawless"]).toBeUndefined();
    const ok = evaluateAchievements(drillCtx({ accuracy: 100, typed: 50 }), EMPTY_ACHIEVEMENTS);
    expect(ok.state.unlocked["flawless"]).toBeTruthy();
  });

  it("flawless shooter requires 10+ words destroyed", () => {
    const base = { mode: "shooter" as const, wpm: 20, accuracy: 100 };
    expect(
      evaluateAchievements({ ...base, wordsDestroyed: 9 }, EMPTY_ACHIEVEMENTS).state.unlocked[
        "flawless"
      ],
    ).toBeUndefined();
    expect(
      evaluateAchievements({ ...base, wordsDestroyed: 10 }, EMPTY_ACHIEVEMENTS).state.unlocked[
        "flawless"
      ],
    ).toBeTruthy();
  });

  it("streak-7 unlocks only at 7 or more", () => {
    expect(
      evaluateAchievements(drillCtx({ streak: 6 }), EMPTY_ACHIEVEMENTS).state.unlocked["streak-7"],
    ).toBeUndefined();
    expect(
      evaluateAchievements(drillCtx({ streak: 7 }), EMPTY_ACHIEVEMENTS).state.unlocked["streak-7"],
    ).toBeTruthy();
  });

  it("focus-5 counter unlocks on the 5th focused run and ignores unfocused runs", () => {
    let state = EMPTY_ACHIEVEMENTS;
    for (let i = 0; i < 4; i++) {
      state = evaluateAchievements(drillCtx({ focused: true }), state).state;
    }
    expect(state.unlocked["focus-5"]).toBeUndefined();
    const fifth = evaluateAchievements(drillCtx({ focused: true }), state);
    expect(fifth.state.unlocked["focus-5"]).toBeTruthy();
    expect(fifth.state.counters["focusRuns"]).toBe(5);

    const unfocused = evaluateAchievements(drillCtx(), fifth.state);
    expect(unfocused.state.counters["focusRuns"]).toBe(5);
  });

  it("shooter level achievements: ace at 5, boss-slayer only from 6", () => {
    const l4 = evaluateAchievements(
      { mode: "shooter", wpm: 10, accuracy: 80, level: 4 },
      EMPTY_ACHIEVEMENTS,
    );
    expect(l4.state.unlocked["shooter-level-5"]).toBeUndefined();

    const l5 = evaluateAchievements(
      { mode: "shooter", wpm: 10, accuracy: 80, level: 5 },
      EMPTY_ACHIEVEMENTS,
    );
    expect(l5.state.unlocked["shooter-level-5"]).toBeTruthy();
    expect(l5.state.unlocked["boss-slayer"]).toBeUndefined();

    const l6 = evaluateAchievements(
      { mode: "shooter", wpm: 10, accuracy: 80, level: 6 },
      EMPTY_ACHIEVEMENTS,
    );
    expect(l6.state.unlocked["shooter-level-5"]).toBeTruthy();
    expect(l6.state.unlocked["boss-slayer"]).toBeTruthy();
  });

  it("is idempotent: re-evaluating the same context unlocks nothing new", () => {
    const ctx = drillCtx({ wpm: 95, accuracy: 100, streak: 8, focused: true });
    const first = evaluateAchievements(ctx, EMPTY_ACHIEVEMENTS);
    const second = evaluateAchievements(ctx, first.state);
    expect(second.newlyUnlocked).toEqual([]);
    expect(Object.keys(second.state.unlocked).length).toBe(
      Object.keys(first.state.unlocked).length,
    );
    expect(second.state.counters["focusRuns"]).toBe(2); // focused still counted per run
  });

  it("sanitizes corrupted storage and clearAchievements empties it", () => {
    localStorage.setItem(
      ACHIEVEMENTS_KEY,
      JSON.stringify({
        unlocked: {
          "speed-60": 123,
          bogus: "2026-01-01",
          "streak-7": "2026-09-28T00:00:00.000Z",
        },
        counters: { focusRuns: -2, bogus: 3 },
      }),
    );
    const loaded = loadAchievements();
    expect(loaded.unlocked).toEqual({ "streak-7": "2026-09-28T00:00:00.000Z" });
    expect(loaded.counters).toEqual({ bogus: 3 });

    localStorage.setItem(ACHIEVEMENTS_KEY, "{broken");
    expect(loadAchievements()).toEqual(EMPTY_ACHIEVEMENTS);

    saveAchievements(evaluateAchievements(drillCtx(), EMPTY_ACHIEVEMENTS).state);
    clearAchievements();
    expect(loadAchievements()).toEqual(EMPTY_ACHIEVEMENTS);
    expect(localStorage.getItem(ACHIEVEMENTS_KEY)).toBeNull();
    expect(ACHIEVEMENTS.length).toBe(10);
  });
});
