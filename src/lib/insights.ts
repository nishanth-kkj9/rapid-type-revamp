import type { RunStats, HistoryEntry } from "./typingStats";
import type { KeySpeedMap } from "./keySpeed";

export interface Insight {
  headline: string; // one sentence, plain language
  tone: "praise" | "coach" | "neutral";
  action?: "practice-weak-keys" | "practice-missed-words" | "none";
}

export function buildInsight(
  stats: RunStats,
  history: HistoryEntry[],
  allTimeSpeed: KeySpeedMap,
  mistakes: Record<string, number>,
): Insight {
  const worstKey = Object.entries(mistakes).sort((a, b) => b[1] - a[1])[0];

  // Slowest key by average interval (needs ≥5 samples to be meaningful)
  const slowest = Object.entries(allTimeSpeed)
    .filter(([, [, n]]) => n >= 5)
    .map(([k, [ms, n]]) => ({ key: k, avg: ms / n }))
    .sort((a, b) => b.avg - a.avg)[0];
  const overallAvg =
    Object.values(allTimeSpeed).reduce((s, [ms]) => s + ms, 0) /
    Math.max(
      1,
      Object.values(allTimeSpeed).reduce((s, [, n]) => s + n, 0),
    );

  if (stats.accuracy < 92 && worstKey && worstKey[1] > 0) {
    return {
      headline: `Accuracy is holding you back — "${worstKey[0] === " " ? "space" : worstKey[0]}" caused ${worstKey[1]} of ${stats.incorrect} errors.`,
      tone: "coach",
      action: "practice-weak-keys",
    };
  }
  if (slowest && slowest.avg > overallAvg * 1.4) {
    return {
      headline: `Your "${slowest.key}" key is ${Math.round(((slowest.avg - overallAvg) / overallAvg) * 100)}% slower than your average — speed is there, one key isn't.`,
      tone: "coach",
      action: "practice-weak-keys",
    };
  }
  if (stats.consistency < 70) {
    return {
      headline: `Fast bursts, uneven pace — consistency ${stats.consistency.toFixed(0)}%. Smooth, steady rhythm beats sprinting.`,
      tone: "coach",
      action: "none",
    };
  }
  if (history.length > 1 && stats.wpm >= Math.max(...history.map((h) => h.wpm))) {
    return {
      headline: `New personal best — ${stats.wpm.toFixed(0)} WPM. You're still climbing.`,
      tone: "praise",
      action: "none",
    };
  }
  return {
    headline: "Solid, controlled run. Push pace by ~5% next round.",
    tone: "neutral",
    action: "none",
  };
}
