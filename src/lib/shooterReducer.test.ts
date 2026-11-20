import { describe, expect, it } from "vitest";
import {
  buildShooterRunSummary,
  createInitialShooterState,
  resolveBreachOutcome,
  shooterGameReducer,
} from "./shooterReducer";

describe("shooterReducer", () => {
  it("initializes standard and practice states cleanly", () => {
    const std = createInitialShooterState(1500, 4, false);
    expect(std.phase).toBe("idle");
    expect(std.lives).toBe(4);
    expect(std.best).toBe(1500);

    const practice = createInitialShooterState(1500, 4, true);
    expect(practice.lives).toBe(0);
    expect(practice.practiceMode).toBe(true);
  });

  it("resets score, streak, power-ups, and stats on START", () => {
    let state = createInitialShooterState(1000, 3, false);
    state = shooterGameReducer(state, {
      type: "START",
      initialWordsSpawned: 3,
      startingLives: 3,
      practiceMode: false,
      targetWord: "laser",
    });

    expect(state.phase).toBe("playing");
    expect(state.wordsSpawned).toBe(3);
    expect(state.lives).toBe(3);
    expect(state.targetWord).toBe("laser");
    expect(state.score).toBe(0);
  });

  it("tracks key hits, wrong/stray keys, streaks, power-ups, bosses, and level-ups", () => {
    let state = shooterGameReducer(createInitialShooterState(500, 3, false), {
      type: "START",
      initialWordsSpawned: 3,
      startingLives: 3,
      practiceMode: false,
      targetWord: "laser",
    });

    // Wrong non-stray key keeps strayKeys at 0
    state = shooterGameReducer(state, {
      type: "KEY_WRONG",
      isStrayKey: false,
      targetWord: "laser",
    });
    expect(state.wrongKeys).toBe(1);
    expect(state.strayKeys).toBe(0);

    // Stray key increments both wrongKeys and strayKeys
    state = shooterGameReducer(state, { type: "KEY_WRONG", isStrayKey: true, targetWord: null });
    expect(state.wrongKeys).toBe(2);
    expect(state.strayKeys).toBe(1);

    // Destroying words awards score and power-ups at 5x Slow-Time and 10x Shield
    for (let i = 1; i <= 10; i++) {
      state = shooterGameReducer(state, {
        type: "KEY_HIT",
        wordDestroyed: true,
        isBoss: i === 5,
        newStreak: i,
        scoreGained: 100,
        targetWord: null,
      });
    }

    expect(state.hits).toBe(10);
    expect(state.streak).toBe(10);
    expect(state.maxStreak).toBe(10);
    expect(state.score).toBe(1000);
    expect(state.bossesDefeated).toBe(1);
    expect(state.slowCharges).toBe(1); // earned at streak 5
    expect(state.shieldCharges).toBe(1); // earned at streak 10
    expect(state.level).toBe(2);
    expect(state.levelBanner).toBe(2);

    // Activate & expire slow time
    state = shooterGameReducer(state, { type: "ACTIVATE_SLOW_TIME" });
    expect(state.slowCharges).toBe(0);
    expect(state.slowTimeActive).toBe(true);
    state = shooterGameReducer(state, { type: "EXPIRE_SLOW_TIME" });
    expect(state.slowTimeActive).toBe(false);
  });

  it("absorbs breaches with shields before subtracting lives and builds run summary", () => {
    expect(resolveBreachOutcome(2, 1, false)).toEqual({
      remainingShields: 0,
      shieldsUsed: 1,
      damage: 1,
    });
    expect(resolveBreachOutcome(3, 0, true)).toEqual({
      remainingShields: 0,
      shieldsUsed: 0,
      damage: 0,
    });

    let state = shooterGameReducer(createInitialShooterState(200, 2, false), {
      type: "START",
      initialWordsSpawned: 3,
      startingLives: 2,
      practiceMode: false,
      targetWord: null,
    });
    for (let i = 1; i <= 10; i++) {
      state = shooterGameReducer(state, {
        type: "KEY_HIT",
        wordDestroyed: true,
        newStreak: i,
        scoreGained: 50,
        targetWord: null,
      });
    }
    expect(state.shieldCharges).toBe(1);

    // First breach absorbed by shield, second costs 1 life
    state = shooterGameReducer(state, { type: "BREACH", breachedCount: 2, practiceMode: false });
    expect(state.shieldCharges).toBe(0);
    expect(state.lives).toBe(1);
    expect(state.streak).toBe(0);

    // Practice mode breach leaves lives unchanged
    const practiceBreached = shooterGameReducer(
      { ...state, lives: 0, practiceMode: true, streak: 4 },
      { type: "BREACH", breachedCount: 2, practiceMode: true },
    );
    expect(practiceBreached.lives).toBe(0);
    expect(practiceBreached.streak).toBe(0);

    // Pause and 3-2-1 resume countdown
    state = shooterGameReducer(state, { type: "PAUSE", reason: "hidden" });
    expect(state.phase).toBe("paused");
    expect(state.pauseReason).toBe("hidden");

    state = shooterGameReducer(state, { type: "BEGIN_RESUME" });
    expect(state.phase).toBe("resuming");
    expect(state.resumeCountdown).toBe(3);

    state = shooterGameReducer(state, { type: "RESUME_TICK" });
    expect(state.resumeCountdown).toBe(2);
    state = shooterGameReducer(state, { type: "RESUME_TICK" });
    expect(state.resumeCountdown).toBe(1);
    state = shooterGameReducer(state, { type: "RESUME_TICK" });
    expect(state.phase).toBe("playing");
    expect(state.resumeCountdown).toBeNull();

    // Game over updates best score in standard mode
    state = shooterGameReducer(state, { type: "GAME_OVER", durationSec: 25 });
    expect(state.phase).toBe("over");
    expect(state.isNewRecord).toBe(true);
    expect(state.best).toBe(500);

    const summary = buildShooterRunSummary(state, {
      durationSec: 25,
      activeTypingSec: 18.4,
      charsDestroyed: 48,
      difficulty: "medium",
      practiceMode: false,
      dailyChallengeDate: "2026-11-17",
      samples: [0, 15, 32, 48],
    });
    expect(summary.score).toBe(500);
    expect(summary.wordsDestroyed).toBe(10);
    expect(summary.dailyChallengeDate).toBe("2026-11-17");
    expect(summary.samples).toEqual([0, 15, 32, 48]);
  });
});
