import { describe, expect, it } from "vitest";
import { buildInsight } from "./insights";
import type { RunStats, HistoryEntry } from "./typingStats";
import type { KeySpeedMap } from "./keySpeed";

const baseStats: RunStats = {
  wpm: 60,
  rawWpm: 62,
  adjustedWpm: 58,
  accuracy: 96,
  consistency: 85,
  correct: 240,
  incorrect: 10,
  typed: 250,
  elapsed: 30,
};

const makeHistory = (wpms: number[]): HistoryEntry[] =>
  wpms.map((wpm, i) => ({
    ...baseStats,
    id: `run-${i}`,
    date: Date.now() - (wpms.length - i) * 60000,
    wpm,
    rawWpm: wpm + 2,
    adjustedWpm: wpm - 2,
    difficulty: "medium",
    mode: "30s",
  }));

describe("buildInsight", () => {
  it("coaches when accuracy is below 92% and worst key is identified", () => {
    const stats: RunStats = { ...baseStats, accuracy: 88, incorrect: 12 };
    const mistakes = { e: 8, t: 4 };
    const insight = buildInsight(stats, makeHistory([50]), {}, mistakes);

    expect(insight.tone).toBe("coach");
    expect(insight.action).toBe("practice-weak-keys");
    expect(insight.headline).toContain('"e" caused 8 of 12 errors');
  });

  it("handles space character nicely in error coach headline", () => {
    const stats: RunStats = { ...baseStats, accuracy: 85, incorrect: 15 };
    const mistakes = { " ": 10 };
    const insight = buildInsight(stats, [], {}, mistakes);

    expect(insight.headline).toContain('"space" caused 10 of 15 errors');
  });

  it("identifies a key that is significantly slower than average", () => {
    const stats: RunStats = { ...baseStats, accuracy: 98, consistency: 80 };
    const allTimeSpeed: KeySpeedMap = {
      e: [500, 5], // 100ms avg
      t: [500, 5], // 100ms avg
      z: [1500, 5], // 300ms avg (> 1.4x overall avg ~150ms)
    };
    const insight = buildInsight(stats, makeHistory([55]), allTimeSpeed, {});

    expect(insight.tone).toBe("coach");
    expect(insight.action).toBe("practice-weak-keys");
    expect(insight.headline).toContain('"z" key is');
  });

  it("coaches on low consistency when accuracy is high", () => {
    const stats: RunStats = { ...baseStats, accuracy: 95, consistency: 62 };
    const insight = buildInsight(stats, makeHistory([50]), {}, {});

    expect(insight.tone).toBe("coach");
    expect(insight.action).toBe("none");
    expect(insight.headline).toContain("Fast bursts, uneven pace — consistency 62%");
  });

  it("praises personal bests with history > 1", () => {
    const stats: RunStats = { ...baseStats, wpm: 85, accuracy: 98, consistency: 88 };
    const history = makeHistory([60, 70, 80]);
    const insight = buildInsight(stats, history, {}, {});

    expect(insight.tone).toBe("praise");
    expect(insight.headline).toContain("New personal best — 85 WPM");
  });

  it("returns solid controlled run fallback when all metrics are steady", () => {
    const stats: RunStats = { ...baseStats, wpm: 65, accuracy: 96, consistency: 82 };
    const history = makeHistory([70]); // not personal best
    const insight = buildInsight(stats, history, {}, {});

    expect(insight.tone).toBe("neutral");
    expect(insight.action).toBe("none");
    expect(insight.headline).toContain("Solid, controlled run");
  });
});
