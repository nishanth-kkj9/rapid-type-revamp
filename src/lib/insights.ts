import {
  filterVisibleHistory,
  formatModeLabel,
  getModeHistory,
  getPersonalBestWpm,
  type HistoryEntry,
  type RunStats,
} from "./typingStats";
import type { KeySpeedMap } from "./keySpeed";

export interface Insight {
  headline: string; // concise coaching sentence grounded in run & recent same-type runs
  tone: "praise" | "coach" | "neutral";
  action?: "practice-weak-keys" | "practice-missed-words" | "none";
}

export interface InsightOptions {
  /** Authoritative personal-best flag from the same mode+difficulty comparison as the PB badge. */
  isRecord?: boolean | undefined;
  /** Mode key (e.g. "30s", "25w", "quote") used to scope recent-10 & PB comparisons. */
  modeKey?: string | undefined;
  /** Difficulty used to scope recent-10 & PB comparisons for time/words modes. */
  difficulty?: string | undefined;
  /** Target WPM from drill settings. */
  targetWpm?: number | undefined;
  /** Optional current run ID so comparisons exclude this run if already saved. */
  currentRunId?: string | undefined;
}

function getSlowestKeyStats(allTimeSpeed: KeySpeedMap) {
  const entries = Object.entries(allTimeSpeed).filter(([, [, n]]) => n >= 5);
  if (entries.length === 0) return null;

  const totalMs = Object.values(allTimeSpeed).reduce((s, [ms]) => s + ms, 0);
  const totalCount = Object.values(allTimeSpeed).reduce((s, [, n]) => s + n, 0);
  const overallAvg = totalCount > 0 ? totalMs / totalCount : 0;
  if (overallAvg <= 0) return null;

  const slowest = entries
    .map(([k, [ms, n]]) => ({ key: k, avg: ms / n }))
    .sort((a, b) => b.avg - a.avg)[0];
  if (!slowest || slowest.avg <= overallAvg * 1.4) return null;

  return {
    key: slowest.key,
    pctSlower: Math.round(((slowest.avg - overallAvg) / overallAvg) * 100),
  };
}

/**
 * Coaching v2: compares the current run against the user's last 10 runs of the same
 * test type (trend, accuracy vs speed balance, slowest key, and target WPM gap).
 * Returns null when there is nothing notable or actionable to say (no generic filler).
 */
export function buildInsight(
  stats: RunStats,
  history: HistoryEntry[],
  allTimeSpeed: KeySpeedMap,
  mistakes: Record<string, number>,
  options?: InsightOptions,
): Insight | null {
  const modeKey = options?.modeKey;
  const scopedRuns = (
    modeKey !== undefined
      ? getModeHistory(history, modeKey, options?.difficulty)
      : filterVisibleHistory(history)
  )
    .filter((h) => h.id !== options?.currentRunId)
    .slice(0, 10);

  const peerCount = scopedRuns.length;
  const peerAvgWpm = peerCount > 0 ? scopedRuns.reduce((s, r) => s + r.wpm, 0) / peerCount : null;
  const peerAvgAcc =
    peerCount > 0 ? scopedRuns.reduce((s, r) => s + r.accuracy, 0) / peerCount : null;
  const modeLabel = modeKey ? formatModeLabel(modeKey) : "recent";
  const targetWpm = options?.targetWpm;

  const worstKey = Object.entries(mistakes).sort((a, b) => b[1] - a[1])[0];
  const slowest = getSlowestKeyStats(allTimeSpeed);

  const scopedBest =
    modeKey !== undefined
      ? getPersonalBestWpm(scopedRuns, modeKey, options?.difficulty)
      : scopedRuns.length > 0
        ? Math.max(...scopedRuns.map((h) => h.wpm))
        : 0;
  const isPersonalBest =
    options?.isRecord !== undefined
      ? options.isRecord
      : scopedRuns.length > 0 && stats.wpm > scopedBest;

  // 1. Severe accuracy bottleneck with identified key error
  if (stats.accuracy < 92 && worstKey && worstKey[1] > 0) {
    const keyLabel = worstKey[0] === " " ? "space" : worstKey[0];
    const paceGap =
      stats.rawWpm - stats.wpm >= 5
        ? ` Slowing down by a beat will recover most of the ${(stats.rawWpm - stats.wpm).toFixed(0)} WPM lost to errors.`
        : "";
    return {
      headline: `Accuracy (${stats.accuracy.toFixed(1)}%) is holding back your speed — "${keyLabel}" caused ${worstKey[1]} of ${stats.incorrect} errors.${paceGap}`,
      tone: "coach",
      action: "practice-weak-keys",
    };
  }

  // 2. Accuracy slipped meaningfully compared to last-10 same-type runs
  if (peerAvgAcc !== null && peerCount >= 3 && stats.accuracy <= peerAvgAcc - 4) {
    const deltaAcc = (peerAvgAcc - stats.accuracy).toFixed(1);
    const keyHint =
      worstKey && worstKey[1] > 0
        ? ` Most slips came on "${worstKey[0] === " " ? "space" : worstKey[0]}".`
        : "";
    return {
      headline: `Accuracy dipped ${deltaAcc}% below your last ${peerCount} ${modeLabel} runs (${peerAvgAcc.toFixed(1)}% avg) — ease pace slightly for cleaner strikes.${keyHint}`,
      tone: "coach",
      action: worstKey && worstKey[1] > 0 ? "practice-weak-keys" : "none",
    };
  }

  // 3. Slowest key bottleneck
  if (slowest) {
    const targetClause =
      targetWpm && stats.wpm < targetWpm
        ? ` Closing that gap helps bridge the ${Math.round(targetWpm - stats.wpm)} WPM to your ${targetWpm} WPM target.`
        : "";
    return {
      headline: `Your "${slowest.key === " " ? "space" : slowest.key}" key is ${slowest.pctSlower}% slower than your average.${targetClause}`,
      tone: "coach",
      action: "practice-weak-keys",
    };
  }

  // 4. Low consistency (erratic rhythm)
  if (stats.consistency < 70) {
    return {
      headline: `Fast bursts, uneven pace — consistency ${stats.consistency.toFixed(0)}%. Keep a steadier rhythm.`,
      tone: "coach",
      action: "none",
    };
  }

  // 5. Personal best (incorporating target WPM & recent trend if available)
  if (isPersonalBest && (peerCount >= 1 || options?.isRecord)) {
    const parts = [`New personal best — ${stats.wpm.toFixed(0)} WPM`];
    if (peerAvgWpm !== null && peerCount >= 2 && stats.wpm > peerAvgWpm + 1) {
      parts.push(
        `(+${(stats.wpm - peerAvgWpm).toFixed(0)} WPM over your last ${peerCount} ${modeLabel} runs)`,
      );
    }
    if (targetWpm) {
      if (stats.wpm >= targetWpm) {
        parts.push(`and above your ${targetWpm} WPM target`);
      } else {
        parts.push(
          `— just ${Math.round(targetWpm - stats.wpm)} WPM shy of your ${targetWpm} WPM target`,
        );
      }
    }
    return {
      headline: `${parts.join(" ")}.`,
      tone: "praise",
      action: "none",
    };
  }

  // 6. Meaningful upward trend vs last 10 runs of the same test type
  if (peerAvgWpm !== null && peerCount >= 3 && stats.wpm >= peerAvgWpm + 4) {
    const gain = (stats.wpm - peerAvgWpm).toFixed(0);
    const targetSuffix =
      targetWpm && stats.wpm < targetWpm
        ? ` (${Math.round(targetWpm - stats.wpm)} WPM away from your ${targetWpm} WPM target)`
        : targetWpm && stats.wpm >= targetWpm
          ? ` — target of ${targetWpm} WPM met`
          : "";
    return {
      headline: `Upward trend — ${stats.wpm.toFixed(0)} WPM is +${gain} WPM faster than your last ${peerCount} ${modeLabel} runs${targetSuffix}.`,
      tone: "praise",
      action: "none",
    };
  }

  // 7. Noticeable speed dip vs last 10 runs OR clean high-accuracy headroom below target
  if (peerAvgWpm !== null && peerCount >= 3 && stats.wpm <= peerAvgWpm - 5) {
    const drop = (peerAvgWpm - stats.wpm).toFixed(0);
    const accNote =
      stats.accuracy >= 97
        ? "Accuracy is high; try picking up your pace slightly."
        : "Focus on reading one word ahead across common words.";
    return {
      headline: `${drop} WPM below your last-${peerCount} ${modeLabel} average (${peerAvgWpm.toFixed(0)} WPM). ${accNote}`,
      tone: "coach",
      action: "none",
    };
  }

  if (targetWpm && stats.accuracy >= 97 && stats.wpm < targetWpm - 4) {
    return {
      headline: `Clean accuracy at ${stats.accuracy.toFixed(1)}% with ${Math.round(targetWpm - stats.wpm)} WPM headroom to reach your ${targetWpm} WPM target.`,
      tone: "neutral",
      action: "none",
    };
  }

  // No meaningful trend, bottleneck, or PB signal — stay quiet instead of emitting generic filler.
  return null;
}
