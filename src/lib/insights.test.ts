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

const makeHistory = (wpms: number[], overrides: Partial<HistoryEntry> = {}): HistoryEntry[] =>
  wpms.map((wpm, i) => ({
    ...baseStats,
    id: `run-${i}`,
    date: Date.now() - (wpms.length - i) * 60000,
    wpm,
    rawWpm: wpm + 2,
    adjustedWpm: wpm - 2,
    difficulty: "medium",
    mode: "30s",
    ...overrides,
  }));

describe("buildInsight (Coaching v2)", () => {
  it("coaches when accuracy is below 92% and worst key is identified", () => {
    const stats: RunStats = { ...baseStats, accuracy: 88, rawWpm: 72, wpm: 60, incorrect: 12 };
    const mistakes = { e: 8, t: 4 };
    const insight = buildInsight(stats, makeHistory([50]), {}, mistakes, {
      modeKey: "30s",
      difficulty: "medium",
    });

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("coach");
    expect(insight!.action).toBe("practice-weak-keys");
    expect(insight!.headline).toContain('"e" caused 8 of 12 errors');
  });

  it("handles space character nicely in error coach headline", () => {
    const stats: RunStats = { ...baseStats, accuracy: 85, incorrect: 15 };
    const mistakes = { " ": 10 };
    const insight = buildInsight(stats, [], {}, mistakes);

    expect(insight).not.toBeNull();
    expect(insight!.headline).toContain('"space" caused 10 of 15 errors');
  });

  it("detects a meaningful accuracy drop relative to last 10 runs of the same test type", () => {
    const history = makeHistory([60, 62, 61, 63], { accuracy: 98.5 });
    const stats: RunStats = { ...baseStats, wpm: 64, accuracy: 93.2, incorrect: 6 };
    const insight = buildInsight(
      stats,
      history,
      {},
      { p: 4 },
      {
        modeKey: "30s",
        difficulty: "medium",
      },
    );

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("coach");
    expect(insight!.headline).toContain("last 4 30s runs");
    expect(insight!.headline).toContain('"p"');
  });

  it("identifies a key that is significantly slower than average and mentions target gap", () => {
    const stats: RunStats = { ...baseStats, wpm: 60, accuracy: 98, consistency: 80 };
    const allTimeSpeed: KeySpeedMap = {
      e: [500, 5],
      t: [500, 5],
      z: [1500, 5],
    };
    const insight = buildInsight(
      stats,
      makeHistory([55]),
      allTimeSpeed,
      {},
      {
        modeKey: "30s",
        difficulty: "medium",
        targetWpm: 75,
      },
    );

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("coach");
    expect(insight!.action).toBe("practice-weak-keys");
    expect(insight!.headline).toContain('"z" key is');
    expect(insight!.headline).toContain("75 WPM target");
  });

  it("coaches on low consistency when accuracy is high", () => {
    const stats: RunStats = { ...baseStats, accuracy: 95, consistency: 62 };
    const insight = buildInsight(stats, makeHistory([50]), {}, {});

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("coach");
    expect(insight!.action).toBe("none");
    expect(insight!.headline).toContain("Fast bursts, uneven pace — consistency 62%");
  });

  it("praises personal bests and upward trends over the last 10 same-type runs", () => {
    const history = makeHistory([60, 70, 80]);
    const stats: RunStats = { ...baseStats, wpm: 85, accuracy: 98, consistency: 88 };
    const insight = buildInsight(
      stats,
      history,
      {},
      {},
      {
        isRecord: true,
        modeKey: "30s",
        difficulty: "medium",
        targetWpm: 80,
      },
    );

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("praise");
    expect(insight!.headline).toContain("New personal best — 85 WPM");
    expect(insight!.headline).toContain("above your 80 WPM target");
  });

  it("compares upward non-PB trend against same-type history without mixing modes", () => {
    const history = [
      ...makeHistory([52, 54, 53, 55], { mode: "25w", difficulty: "medium" }),
      // Much higher quote runs must not pollute 25w last-10 average
      ...makeHistory([120, 125], { mode: "quote", difficulty: "medium" }),
    ];
    const stats: RunStats = { ...baseStats, wpm: 62, accuracy: 97, consistency: 86 };
    const insight = buildInsight(
      stats,
      history,
      {},
      {},
      {
        isRecord: false,
        modeKey: "25w",
        difficulty: "medium",
        targetWpm: 70,
      },
    );

    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("praise");
    expect(insight!.headline).toContain("Upward trend");
    expect(insight!.headline).toContain("25 words runs");
  });

  it("returns null instead of generic filler when run is unremarkable", () => {
    const history = makeHistory([64, 65, 66]); // avg 65, high 66
    const stats: RunStats = { ...baseStats, wpm: 65, accuracy: 96, consistency: 82 };
    const insight = buildInsight(
      stats,
      history,
      {},
      {},
      {
        isRecord: false,
        modeKey: "30s",
        difficulty: "medium",
        targetWpm: 60,
      },
    );

    expect(insight).toBeNull();
  });

  it("agrees with scoped PB comparison across modes and difficulties", () => {
    const stats: RunStats = { ...baseStats, wpm: 72, accuracy: 98, consistency: 90 };
    const history: HistoryEntry[] = [
      { ...baseStats, id: "q1", date: 1, wpm: 110, mode: "quote", difficulty: "medium" },
      { ...baseStats, id: "e1", date: 2, wpm: 100, mode: "30s", difficulty: "easy" },
      { ...baseStats, id: "h1", date: 3, wpm: 68, mode: "30s", difficulty: "hard" },
    ];
    const insight = buildInsight(
      stats,
      history,
      {},
      {},
      {
        isRecord: true,
        modeKey: "30s",
        difficulty: "hard",
      },
    );
    expect(insight).not.toBeNull();
    expect(insight!.tone).toBe("praise");
    expect(insight!.headline).toContain("New personal best — 72 WPM");
  });
});
