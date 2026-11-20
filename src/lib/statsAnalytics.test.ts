import { describe, expect, it } from "vitest";
import {
  buildActivityCalendar,
  computeArcadePersonalBests,
  computeStatsSummary,
  downsampleProgressPoints,
  formatTotalDuration,
  isLearnMode,
} from "./statsAnalytics";
import type { HistoryEntry } from "./typingStats";

const mkRun = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "run-1",
  date: Date.UTC(2026, 2, 10, 12, 0, 0),
  difficulty: "medium",
  mode: "30s",
  wpm: 65,
  rawWpm: 70,
  adjustedWpm: 62,
  accuracy: 96,
  correct: 160,
  incorrect: 6,
  typed: 166,
  elapsed: 30,
  consistency: 88,
  ...over,
});

describe("statsAnalytics", () => {
  it("recognizes learn mode variants", () => {
    expect(isLearnMode("learn")).toBe(true);
    expect(isLearnMode("learn-home-row")).toBe(true);
    expect(isLearnMode("learn:top-row")).toBe(true);
    expect(isLearnMode("30s")).toBe(false);
    expect(isLearnMode("25w")).toBe(false);
  });

  it("computes zeroed summary cleanly for 0 runs", () => {
    expect(computeStatsSummary([])).toEqual({
      totalRuns: 0,
      drillRuns: 0,
      shooterRuns: 0,
      totalElapsedSec: 0,
      bestWpm: 0,
      avgAccuracyLast20: null,
    });
  });

  it("computes total runs, elapsed seconds, standard best WPM, and last-20 accuracy", () => {
    const runs: HistoryEntry[] = [];
    // 20 recent drill runs at 95% accuracy, 60 WPM
    for (let i = 0; i < 20; i++) {
      runs.push(
        mkRun({
          id: `d-${i}`,
          date: 2_000_000 + i * 1000,
          wpm: 60 + (i === 5 ? 18 : 0),
          accuracy: 95,
          elapsed: 30,
        }),
      );
    }
    // Older run with 70% accuracy must NOT dilute last 20 accuracy window
    runs.push(
      mkRun({
        id: "old-low",
        date: 1_000_000,
        wpm: 40,
        accuracy: 70,
        elapsed: 60,
      }),
    );
    // Excluded PB runs: repeated, learn, shooter
    runs.push(
      mkRun({
        id: "rep-high",
        date: 1_500_000,
        wpm: 140,
        accuracy: 95,
        elapsed: 30,
        repeated: true,
      }),
      mkRun({
        id: "learn-high",
        date: 1_500_001,
        mode: "learn-home-row",
        wpm: 135,
        accuracy: 95,
        elapsed: 45,
      }),
      mkRun({
        id: "shooter-high",
        date: 1_500_002,
        mode: "shooter",
        wpm: 150,
        accuracy: 95,
        elapsed: 90,
      }),
    );

    const summary = computeStatsSummary(runs);
    expect(summary.totalRuns).toBe(24);
    expect(summary.drillRuns).toBe(23);
    expect(summary.shooterRuns).toBe(1);
    expect(summary.totalElapsedSec).toBe(20 * 30 + 60 + 30 + 45 + 90);
    expect(summary.bestWpm).toBe(78);
    expect(summary.avgAccuracyLast20).toBe(95);
  });

  it("formats elapsed durations into s, m, and h strings", () => {
    expect(formatTotalDuration(42)).toBe("42s");
    expect(formatTotalDuration(180)).toBe("3m");
    expect(formatTotalDuration(195)).toBe("3m 15s");
    expect(formatTotalDuration(3600)).toBe("1h");
    expect(formatTotalDuration(5430)).toBe("1h 30m");
  });

  it("builds 26-week activity calendar matching exact history dates and counts", () => {
    const today = "2026-04-15"; // Wednesday
    const t1 = new Date(2026, 3, 15, 10, 0, 0).getTime(); // Apr 15
    const t2 = new Date(2026, 3, 15, 15, 0, 0).getTime(); // Apr 15
    const t3 = new Date(2026, 3, 10, 9, 30, 0).getTime(); // Apr 10
    const oldOutOfWindow = new Date(2025, 0, 1, 9, 0, 0).getTime();

    const runs: HistoryEntry[] = [
      mkRun({ id: "a", date: t1, elapsed: 90 }),
      mkRun({ id: "b", date: t2, elapsed: 30 }),
      mkRun({ id: "c", date: t3, elapsed: 180 }),
      mkRun({ id: "old", date: oldOutOfWindow, elapsed: 60 }),
    ];

    const cal = buildActivityCalendar(runs, "runs", today, 26);
    expect(cal.weeks).toHaveLength(26);
    expect(cal.endDate).toBe("2026-04-15");
    expect(cal.totalRuns).toBe(3);
    expect(cal.activeDays).toBe(2);
    expect(cal.totalMinutes).toBe(5);

    const apr15 = cal.flatDays.find((d) => d.date === "2026-04-15");
    expect(apr15?.runs).toBe(2);
    expect(apr15?.minutes).toBe(2);
    expect(apr15?.level).toBe(4);

    const apr10 = cal.flatDays.find((d) => d.date === "2026-04-10");
    expect(apr10?.runs).toBe(1);
    expect(apr10?.minutes).toBe(3);
    expect(apr10?.level).toBe(2);

    const byMinutes = buildActivityCalendar(runs, "minutes", today, 26);
    const apr10Min = byMinutes.flatDays.find((d) => d.date === "2026-04-10");
    expect(apr10Min?.level).toBe(4);
  });

  it("downsamples large point arrays cleanly while preserving endpoints", () => {
    const small = [1, 2, 3, 4, 5];
    expect(downsampleProgressPoints(small, 120)).toEqual(small);

    const huge = Array.from({ length: 2000 }, (_, i) => i);
    const sampled = downsampleProgressPoints(huge, 120);
    expect(sampled).toHaveLength(120);
    expect(sampled[0]).toBe(0);
    expect(sampled[sampled.length - 1]).toBe(1999);
  });

  it("computes Arcade personal bests from shooter history excluding practice scores", () => {
    expect(computeArcadePersonalBests([])).toEqual({
      totalGames: 0,
      bestScore: 0,
      bestLevel: 0,
      bestStreak: 0,
      bossesDefeated: 0,
    });

    const runs: HistoryEntry[] = [
      mkRun({ id: "d1", mode: "30s", score: 9999 }),
      mkRun({
        id: "s1",
        mode: "shooter",
        score: 2100,
        level: 6,
        maxStreak: 14,
        bossesDefeated: 1,
      }),
      mkRun({
        id: "s2",
        mode: "shooter",
        score: 8800,
        level: 8,
        maxStreak: 22,
        bossesDefeated: 2,
        practiceMode: true,
      }),
      mkRun({
        id: "s3",
        mode: "shooter",
        score: 1400,
        level: 4,
        maxStreak: 9,
        bossesDefeated: 0,
      }),
    ];

    expect(computeArcadePersonalBests(runs)).toEqual({
      totalGames: 3,
      bestScore: 2100,
      bestLevel: 8,
      bestStreak: 22,
      bossesDefeated: 3,
    });
  });
});
