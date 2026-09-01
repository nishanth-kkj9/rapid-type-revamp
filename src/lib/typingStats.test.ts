// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  computeStats,
  toDeltas,
  loadHistory,
  saveRun,
  importHistory,
  clearHistory,
  type HistoryEntry,
} from "./typingStats";

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "a",
  date: 1,
  difficulty: "easy",
  mode: "30",
  wpm: 50,
  rawWpm: 55,
  adjustedWpm: 45,
  accuracy: 90,
  correct: 100,
  incorrect: 10,
  typed: 110,
  elapsed: 30,
  consistency: 80,
  ...over,
});

describe("computeStats", () => {
  it("computes wpm and accuracy over a minute", () => {
    const s = computeStats(50, 5, 60000, []);
    expect(s.wpm).toBe(10);
    expect(s.accuracy).toBe(Math.round((50 / 55) * 1000) / 10);
  });

  it("clamps sub-second elapsed time", () => {
    const s = computeStats(0, 0, 500, []);
    expect(s.wpm).toBe(0);
    expect(Number.isFinite(s.rawWpm)).toBe(true);
  });

  it("keeps consistency within 0..100", () => {
    const s = computeStats(10, 0, 60000, [2, 5, 8]);
    expect(s.consistency).toBeGreaterThanOrEqual(0);
    expect(s.consistency).toBeLessThanOrEqual(100);
  });
});

describe("toDeltas", () => {
  it("converts cumulative counts to deltas", () => {
    expect(toDeltas([])).toEqual([]);
    expect(toDeltas([3])).toEqual([3]);
    expect(toDeltas([3, 7, 12])).toEqual([3, 4, 5]);
  });
});

describe("history storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips a saved run", () => {
    const { ok } = saveRun(entry());
    expect(ok).toBe(true);
    expect(loadHistory()).toHaveLength(1);
  });

  it("migrates the legacy key", () => {
    window.localStorage.setItem("ttp:history", JSON.stringify([entry()]));
    expect(loadHistory()).toHaveLength(1);
    expect(window.localStorage.getItem("ttp:history:v1")).toBeTruthy();
    expect(window.localStorage.getItem("ttp:history")).toBeNull();
  });

  it("rejects malformed and invalid imports", () => {
    expect(importHistory("not json")).toBeNull();
    expect(importHistory(JSON.stringify([{ id: "x", date: 1 }]))).toBeNull();
  });

  it("merges imports by id without duplicating", () => {
    saveRun(entry());
    const merged = importHistory(JSON.stringify([entry({ wpm: 70 }), entry({ id: "b", date: 2 })]));
    expect(merged).not.toBeNull();
    expect(merged).toHaveLength(2);
    expect(merged!.find((e) => e.id === "a")!.wpm).toBe(70);
  });

  it("clears history", () => {
    saveRun(entry());
    expect(clearHistory()).toEqual([]);
    expect(loadHistory()).toEqual([]);
  });
});
