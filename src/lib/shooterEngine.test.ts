import { describe, expect, it } from "vitest";
import {
  applyKeyToEnemies,
  awardPowerUpsForStreak,
  computeDifficultyCurve,
  computeShooterAccuracy,
  computeShooterHitRate,
  computeShooterLevel,
  createInitialEnemies,
  createSeededRng,
  dateStringToSeed,
  isBossLevel,
  MAX_ENEMY_SPEED,
  pickBossWord,
  stepEnemies,
  wordPoolFor,
  type Enemy,
} from "./shooterEngine";

describe("shooterEngine", () => {
  const mockEnemies: Enemy[] = [
    { id: 1, word: "laser", typed: 0, x: 25, y: 10, speed: 5 },
    { id: 2, word: "speed", typed: 0, x: 50, y: 30, speed: 6 },
    { id: 3, word: "ship", typed: 0, x: 75, y: 50, speed: 7 },
  ];

  it("locks onto lowest enemy matching starting char", () => {
    const result = applyKeyToEnemies(mockEnemies, "s", null, 0);
    expect(result.nextTargetId).toBe(3);
    expect(result.wrongKey).toBe(false);
    expect(result.isStrayKey).toBe(false);
    expect(result.expectedChar).toBe("s");
    expect(result.pressedChar).toBe("s");
    expect(result.nextEnemies.find((e) => e.id === 3)?.typed).toBe(1);
  });

  it("attributes unlocked wrong key to an adjacent expected char or marks stray key when unknown", () => {
    // 'z' is adjacent to 's' on QWERTY -> attributes to lowest matching enemy 'ship' ('s')
    const adjResult = applyKeyToEnemies(mockEnemies, "z", null, 2);
    expect(adjResult.wrongKey).toBe(true);
    expect(adjResult.newStreak).toBe(0);
    expect(adjResult.nextTargetId).toBeNull();
    expect(adjResult.expectedChar).toBe("s");
    expect(adjResult.isStrayKey).toBe(false);

    // 'n' is NOT adjacent to 'l' or 's' -> stray key with expectedChar = null
    const strayResult = applyKeyToEnemies(mockEnemies, "n", null, 2);
    expect(strayResult.wrongKey).toBe(true);
    expect(strayResult.expectedChar).toBeNull();
    expect(strayResult.isStrayKey).toBe(true);
    expect(strayResult.pressedChar).toBe("n");
  });

  it("attributes wrong key to the single enemy on screen even if non-adjacent", () => {
    const solo: Enemy[] = [{ id: 9, word: "focus", typed: 0, x: 50, y: 40, speed: 4 }];
    const res = applyKeyToEnemies(solo, "m", null, 1);
    expect(res.wrongKey).toBe(true);
    expect(res.expectedChar).toBe("f");
    expect(res.isStrayKey).toBe(false);
  });

  it("advances progress on locked target and destroys word on completion", () => {
    const almostDone: Enemy[] = [{ id: 1, word: "laser", typed: 4, x: 25, y: 10, speed: 5 }];
    const result = applyKeyToEnemies(almostDone, "r", 1, 4);
    expect(result.wordDestroyed).not.toBeNull();
    expect(result.wordDestroyed?.id).toBe(1);
    expect(result.nextEnemies).toHaveLength(0);
    expect(result.nextTargetId).toBeNull();
    expect(result.scoreGained).toBeGreaterThan(0);
    expect(result.newStreak).toBe(5);
    expect(result.expectedChar).toBe("r");
    expect(result.pressedChar).toBe("r");
  });

  it("reports expectedChar and pressedChar on targeted wrong key", () => {
    const targetEnemy: Enemy[] = [{ id: 1, word: "laser", typed: 2, x: 25, y: 10, speed: 5 }];
    const result = applyKeyToEnemies(targetEnemy, "x", 1, 3);
    expect(result.wrongKey).toBe(true);
    expect(result.isStrayKey).toBe(false);
    expect(result.expectedChar).toBe("s");
    expect(result.pressedChar).toBe("x");
  });

  it("correctly steps enemies (with speedFactor support) and identifies breached enemies", () => {
    const enemies: Enemy[] = [
      { id: 1, word: "safe", typed: 0, x: 20, y: 50, speed: 10 },
      { id: 2, word: "breach", typed: 0, x: 50, y: 85, speed: 10 },
    ];
    const slowed = stepEnemies(enemies, 1, 2, 0.4);
    expect(slowed.surviving).toHaveLength(1); // id 1 at 54, id 2 at 89 (>= 88)
    expect(slowed.breached).toHaveLength(1);
    expect(slowed.clearedTargetId).toBe(true);
  });

  it("computes per-character accuracy separately from hit rate", () => {
    // 45 correct keystrokes out of 50 total keystrokes => 90% accuracy
    expect(computeShooterAccuracy(45, 50)).toBe(90);
    expect(computeShooterAccuracy(0, 0)).toBe(100);
    // 9 words destroyed out of 12 spawned => 75% hit rate
    expect(computeShooterHitRate(9, 12)).toBe(75);
    expect(computeShooterHitRate(0, 0)).toBe(100);
  });

  it("creates initial enemies with distinct starting letters", () => {
    const initial = createInitialEnemies(["apple", "banana", "cat"], 1, 1);
    expect(initial.length).toBe(3);
    const firstChars = initial.map((e) => e.word[0]);
    expect(new Set(firstChars).size).toBe(3);
  });

  it("excludes short function words on medium/hard and weights weak keys & missed words", () => {
    const medPool = wordPoolFor("medium", {
      missedWords: ["the", "and", "rhythm"],
      weakKeys: ["q", "z"],
    });
    expect(medPool.length).toBeGreaterThan(150);
    expect(medPool).not.toContain("the");
    expect(medPool).not.toContain("and");
    expect(medPool).toContain("rhythm");

    const hardPool = wordPoolFor("hard", { weakKeys: ["x", "q"] });
    expect(hardPool.length).toBeGreaterThan(300);
    expect(hardPool.every((w) => w.length >= 5)).toBe(true);
  });

  it("produces identical word pools for the same daily challenge seed", () => {
    const seed = dateStringToSeed("2026-11-15");
    const poolA = wordPoolFor("medium", { rng: createSeededRng(seed) }).slice(0, 30);
    const poolB = wordPoolFor("medium", { rng: createSeededRng(seed) }).slice(0, 30);
    expect(poolA).toEqual(poolB);

    const poolOtherDay = wordPoolFor("medium", {
      rng: createSeededRng(dateStringToSeed("2026-11-16")),
    }).slice(0, 30);
    expect(poolA).not.toEqual(poolOtherDay);
  });

  it("progresses levels by words destroyed & accuracy, gating boss levels until boss defeated", () => {
    expect(
      computeShooterLevel({
        wordsDestroyed: 0,
        accuracy: 100,
        currentLevel: 1,
        bossDefeatedAtLevel: 0,
      }),
    ).toBe(1);

    expect(
      computeShooterLevel({
        wordsDestroyed: 8,
        accuracy: 100,
        currentLevel: 1,
        bossDefeatedAtLevel: 0,
      }),
    ).toBe(2);

    // On level 5 (boss level), cannot advance to 6 until bossDefeatedAtLevel >= 5
    expect(
      computeShooterLevel({
        wordsDestroyed: 60,
        accuracy: 100,
        currentLevel: 5,
        bossDefeatedAtLevel: 0,
      }),
    ).toBe(5);

    // Once boss on level 5 is defeated, advances to level 6
    expect(
      computeShooterLevel({
        wordsDestroyed: 40,
        accuracy: 100,
        currentLevel: 5,
        bossDefeatedAtLevel: 5,
      }),
    ).toBe(6);
  });

  it("caps enemy speed growth smoothly across high levels", () => {
    const lvl1 = computeDifficultyCurve(1, 1);
    const lvl10 = computeDifficultyCurve(10, 1);
    const lvl100 = computeDifficultyCurve(100, 2.5);

    expect(lvl10.baseSpeed).toBeGreaterThan(lvl1.baseSpeed);
    expect(lvl100.maxSpeed).toBeLessThanOrEqual(MAX_ENEMY_SPEED);
    expect(lvl100.maxSimultaneous).toBe(8);
    expect(lvl100.spawnInterval).toBeGreaterThanOrEqual(0.4);
  });

  it("identifies boss levels at every 5 levels and picks distinct boss words", () => {
    expect(isBossLevel(0)).toBe(false);
    expect(isBossLevel(1)).toBe(false);
    expect(isBossLevel(4)).toBe(false);
    expect(isBossLevel(5)).toBe(true);
    expect(isBossLevel(10)).toBe(true);

    const bossWord = pickBossWord("easy", mockEnemies, ["short"]);
    expect(bossWord.length).toBeGreaterThanOrEqual(7);
  });

  it("awards double score for boss enemies and grants streak power-ups", () => {
    const regular: Enemy = { id: 10, word: "corrupted", typed: 8, x: 20, y: 10, speed: 2 };
    const boss: Enemy = {
      id: 11,
      word: "corrupted",
      typed: 8,
      x: 20,
      y: 10,
      speed: 1.1,
      boss: true,
    };

    const regResult = applyKeyToEnemies([regular], "d", 10, 0);
    expect(regResult.multiplier).toBe(1);
    expect(regResult.scoreGained).toBe(90);

    const bossResult = applyKeyToEnemies([boss], "d", 11, 0);
    expect(bossResult.multiplier).toBe(2);
    expect(bossResult.scoreGained).toBe(180);

    const p5 = awardPowerUpsForStreak(5, 0, 0);
    expect(p5).toEqual({ slowCharges: 1, shieldCharges: 0, earnedSlow: true, earnedShield: false });

    const p10 = awardPowerUpsForStreak(10, 1, 0);
    expect(p10).toEqual({
      slowCharges: 1,
      shieldCharges: 1,
      earnedSlow: false,
      earnedShield: true,
    });
  });
});
