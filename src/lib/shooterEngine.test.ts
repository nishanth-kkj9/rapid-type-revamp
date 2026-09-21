import { describe, expect, it } from "vitest";
import {
  applyKeyToEnemies,
  createInitialEnemies,
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
    // Both 'speed' (y=30) and 'ship' (y=50) start with 's'. Lowest is 'ship' (y=50).
    const result = applyKeyToEnemies(mockEnemies, "s", null, 0);
    expect(result.nextTargetId).toBe(3);
    expect(result.wrongKey).toBe(false);
    expect(result.nextEnemies.find((e) => e.id === 3)?.typed).toBe(1);
  });

  it("handles wrong key when no enemy starts with the character", () => {
    const result = applyKeyToEnemies(mockEnemies, "z", null, 2);
    expect(result.wrongKey).toBe(true);
    expect(result.newStreak).toBe(0);
    expect(result.nextTargetId).toBeNull();
  });

  it("advances progress on locked target and destroys word on completion", () => {
    // Target is 'laser' (id 1). Already typed 'lase' (typed: 4).
    const almostDone: Enemy[] = [{ id: 1, word: "laser", typed: 4, x: 25, y: 10, speed: 5 }];
    const result = applyKeyToEnemies(almostDone, "r", 1, 4);
    expect(result.wordDestroyed).not.toBeNull();
    expect(result.wordDestroyed?.id).toBe(1);
    expect(result.nextEnemies).toHaveLength(0);
    expect(result.nextTargetId).toBeNull();
    expect(result.scoreGained).toBeGreaterThan(0);
    expect(result.newStreak).toBe(5);
  });

  it("correctly steps enemies and identifies breached enemies", () => {
    const enemies: Enemy[] = [
      { id: 1, word: "safe", typed: 0, x: 20, y: 50, speed: 10 },
      { id: 2, word: "breach", typed: 0, x: 50, y: 85, speed: 10 },
    ];
    // dt = 1 second => id 1 y=60 (safe), id 2 y=95 (>= 88 breached)
    const { surviving, breached, clearedTargetId } = stepEnemies(enemies, 1, 2);
    expect(surviving).toHaveLength(1);
    expect(surviving[0]?.id).toBe(1);
    expect(breached).toHaveLength(1);
    expect(breached[0]?.id).toBe(2);
    expect(clearedTargetId).toBe(true);
  });

  it("creates initial enemies with distinct starting letters", () => {
    const initial = createInitialEnemies(["apple", "banana", "cat"], 1, 1);
    expect(initial.length).toBe(3);
    const firstChars = initial.map((e) => e.word[0]);
    expect(new Set(firstChars).size).toBe(3);
  });

  it("generates word pool without throwing", () => {
    const pool = wordPoolFor("easy");
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((w) => w.length >= 2)).toBe(true);
  });
});
