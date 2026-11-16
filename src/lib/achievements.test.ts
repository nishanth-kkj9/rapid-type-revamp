// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_KEY,
  clearAchievements,
  didImproveWeakKey,
  EMPTY_ACHIEVEMENTS,
  evaluateAchievements,
  getAchievementProgress,
  getNextUpAchievements,
  loadAchievements,
  saveAchievements,
  type RunContext,
} from "./achievements";

const drillCtx = (over: Partial<RunContext> = {}): RunContext => ({
  mode: "drill",
  drillMode: "time",
  durationSec: 30,
  wpm: 30,
  accuracy: 90,
  consistency: 75,
  typed: 60,
  correctChars: 55,
  ...over,
});

describe("achievements v2", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("includes 30+ achievements across all mastery categories", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    const categories = new Set(ACHIEVEMENTS.map((a) => a.category));
    expect(categories).toEqual(
      new Set(["speed", "accuracy", "consistency", "volume", "streaks", "mastery", "shooter"]),
    );
  });

  it("any completed run unlocks first-run and persists via save/load", () => {
    const { state, newlyUnlocked } = evaluateAchievements(drillCtx(), EMPTY_ACHIEVEMENTS);
    expect(newlyUnlocked.map((a) => a.id)).toEqual(["first-run"]);
    saveAchievements(state);
    expect(loadAchievements().unlocked["first-run"]).toEqual(state.unlocked["first-run"]);
  });

  it("speed milestones unlock cumulatively and per test type", () => {
    const time60 = evaluateAchievements(
      drillCtx({ drillMode: "time", durationSec: 60, wpm: 100 }),
      EMPTY_ACHIEVEMENTS,
    );
    expect(time60.newlyUnlocked.map((a) => a.id)).toEqual([
      "speed-40",
      "speed-60",
      "speed-80",
      "speed-100",
      "speed-time-60",
      "first-run",
    ]);

    const wordsRun = evaluateAchievements(
      drillCtx({ drillMode: "words", wpm: 82 }),
      EMPTY_ACHIEVEMENTS,
    );
    expect(wordsRun.state.unlocked["speed-words-80"]).toBeTruthy();

    const quoteRun = evaluateAchievements(
      drillCtx({ drillMode: "quote", wpm: 72 }),
      EMPTY_ACHIEVEMENTS,
    );
    expect(quoteRun.state.unlocked["speed-quote-70"]).toBeTruthy();
  });

  it("unlocks tiered flawless runs by length and shooter flawless runs", () => {
    const low = evaluateAchievements(drillCtx({ accuracy: 100, typed: 49 }), EMPTY_ACHIEVEMENTS);
    expect(low.state.unlocked["flawless"]).toBeUndefined();

    const full500 = evaluateAchievements(
      drillCtx({ accuracy: 100, typed: 500, correctChars: 500 }),
      EMPTY_ACHIEVEMENTS,
    );
    expect(full500.state.unlocked["flawless"]).toBeTruthy();
    expect(full500.state.unlocked["flawless-25w"]).toBeTruthy();
    expect(full500.state.unlocked["flawless-50w"]).toBeTruthy();
    expect(full500.state.unlocked["flawless-100w"]).toBeTruthy();

    const shooterFlawless = evaluateAchievements(
      { mode: "shooter", wpm: 25, accuracy: 100, wordsDestroyed: 10 },
      EMPTY_ACHIEVEMENTS,
    );
    expect(shooterFlawless.state.unlocked["flawless"]).toBeTruthy();
  });

  it("evaluates consistency, streaks, volume, and weak-key mastery achievements", () => {
    const res = evaluateAchievements(
      drillCtx({
        wpm: 65,
        accuracy: 98,
        consistency: 96,
        typed: 160,
        correctChars: 2500, // 500 words
        streak: 7,
        focused: true,
        improvedWeakKey: true,
        wordsGraduated: 1,
      }),
      EMPTY_ACHIEVEMENTS,
    );
    expect(res.state.unlocked["consistency-85"]).toBeTruthy();
    expect(res.state.unlocked["consistency-92"]).toBeTruthy();
    expect(res.state.unlocked["consistency-96"]).toBeTruthy();
    expect(res.state.unlocked["streak-3"]).toBeTruthy();
    expect(res.state.unlocked["streak-7"]).toBeTruthy();
    expect(res.state.unlocked["streak-30"]).toBeUndefined();
    expect(res.state.unlocked["words-500"]).toBeTruthy();
    expect(res.state.unlocked["weak-key-1"]).toBeTruthy();
    expect(res.state.unlocked["word-redeemer"]).toBeTruthy();
  });

  it("didImproveWeakKey checks top weak keys appearing >= 5 times with 0 mistakes at >= 95% acc", () => {
    expect(didImproveWeakKey(["q"], "quick quiet quilt queen quack", { q: 0 }, 96)).toBe(true);
    expect(didImproveWeakKey(["q"], "quick quiet quilt queen quack", { q: 1 }, 96)).toBe(false);
    expect(didImproveWeakKey(["q"], "quick quiet quilt", {}, 96)).toBe(false);
    expect(didImproveWeakKey(["q"], "quick quiet quilt queen quack", {}, 94)).toBe(false);
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

  it("shooter achievements track levels, actual bosses defeated, and word streaks", () => {
    const l5NoBoss = evaluateAchievements(
      { mode: "shooter", wpm: 10, accuracy: 80, level: 5, bossesDefeated: 0, shooterStreak: 16 },
      EMPTY_ACHIEVEMENTS,
    );
    expect(l5NoBoss.state.unlocked["shooter-level-5"]).toBeTruthy();
    expect(l5NoBoss.state.unlocked["boss-slayer"]).toBeUndefined();
    expect(l5NoBoss.state.unlocked["shooter-streak-15"]).toBeTruthy();

    const l6NoBoss = evaluateAchievements(
      { mode: "shooter", wpm: 10, accuracy: 80, level: 6, bossesDefeated: 0 },
      l5NoBoss.state,
    );
    expect(l6NoBoss.state.unlocked["boss-slayer"]).toBeUndefined();

    const bossSlain = evaluateAchievements(
      { mode: "shooter", wpm: 45, accuracy: 92, level: 10, bossesDefeated: 5, shooterStreak: 32 },
      l6NoBoss.state,
    );
    expect(bossSlain.state.unlocked["boss-slayer"]).toBeTruthy();
    expect(bossSlain.state.unlocked["boss-hunter-5"]).toBeTruthy();
    expect(bossSlain.state.unlocked["shooter-level-10"]).toBeTruthy();
    expect(bossSlain.state.unlocked["shooter-streak-30"]).toBeTruthy();
  });

  it("computes progress percentages and next-up sorting", () => {
    const afterOne = evaluateAchievements(
      drillCtx({ wpm: 50, correctChars: 1250 }), // 250 words
      EMPTY_ACHIEVEMENTS,
    ).state;
    const w500Def = ACHIEVEMENTS.find((a) => a.id === "words-500")!;
    const prog = getAchievementProgress(w500Def, afterOne);
    expect(prog.unlockedAt).toBeNull();
    expect(prog.current).toBe(250);
    expect(prog.percent).toBe(50);

    const nextUp = getNextUpAchievements(afterOne, undefined, 3);
    expect(nextUp.length).toBe(3);
    expect(nextUp[0]!.percent).toBeGreaterThanOrEqual(nextUp[1]!.percent);
  });

  it("is idempotent on single-run thresholds and sanitizes corrupted storage", () => {
    const ctx = drillCtx({ wpm: 95, accuracy: 100, streak: 8, focused: true });
    const first = evaluateAchievements(ctx, EMPTY_ACHIEVEMENTS);
    const second = evaluateAchievements(ctx, first.state);
    expect(second.newlyUnlocked).toEqual([]);
    expect(Object.keys(second.state.unlocked).length).toBe(
      Object.keys(first.state.unlocked).length,
    );

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
  });
});
