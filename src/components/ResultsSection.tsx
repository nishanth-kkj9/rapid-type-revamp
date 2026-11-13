import { lazy, Suspense, type RefObject } from "react";
import { Target } from "lucide-react";
import type { RunStats } from "@/lib/typingStats";
import type { DrillMode } from "@/lib/drillSettings";
import type { KeySpeedMap } from "@/lib/keySpeed";
import type { AchievementState } from "@/lib/achievements";
import type { Insight } from "@/lib/insights";
import { ProblemKeys } from "@/components/ProblemKeys";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { AchievementsStrip } from "@/components/AchievementsStrip";
import { ChartSkeleton } from "@/components/Skeletons";

const LazyWpmChart = lazy(() =>
  import("@/components/WpmChart").then((m) => ({ default: m.WpmChart })),
);

export interface ResultsSectionProps {
  resultsRef: RefObject<HTMLElement | null>;
  againRef: RefObject<HTMLButtonElement | null>;
  shown: RunStats;
  isRecord: boolean;
  recordDelta: number | null;
  targetWpm: number;
  insight: Insight | null;
  effectiveMissedWordsCount: number;
  weakKeys3: string[];
  tabToRestart: boolean;
  samples: number[];
  ghostSamples: number[] | undefined;
  mistakes: Record<string, number>;
  allTimeKeys: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  unlockedAchievements: AchievementState["unlocked"];
  drillMode: DrillMode;
  quoteAuthor: string | null;
  onRestart: () => void;
  onPracticeWeakKeys: () => void;
  onPracticeMissedWords: () => void;
  onSwitchToShooter: () => void;
}

export function ResultsSection({
  resultsRef,
  againRef,
  shown,
  isRecord,
  recordDelta,
  targetWpm,
  insight,
  effectiveMissedWordsCount,
  weakKeys3,
  tabToRestart,
  samples,
  ghostSamples,
  mistakes,
  allTimeKeys,
  allTimeSpeed,
  unlockedAchievements,
  drillMode,
  quoteAuthor,
  onRestart,
  onPracticeWeakKeys,
  onPracticeMissedWords,
  onSwitchToShooter,
}: ResultsSectionProps) {
  return (
    <section
      ref={resultsRef}
      tabIndex={-1}
      aria-label="Run results"
      className="panel relative mt-4 flex flex-col items-center justify-start gap-4 p-6 text-center focus-visible:outline-none sm:p-8"
    >
      {isRecord ? (
        <span className="animate-in fade-in zoom-in-95 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground shadow-sm duration-300">
          New personal best
          {recordDelta != null && recordDelta > 0 ? ` (+${recordDelta} wpm)` : ""}
        </span>
      ) : null}
      {shown.wpm >= targetWpm ? (
        <span className="success-ping rounded-full bg-primary/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          Target met
        </span>
      ) : null}
      <div
        className={`font-mono text-4xl font-bold transition-all sm:text-5xl ${
          isRecord ? "text-primary record-glow" : "text-primary"
        }`}
      >
        {shown.wpm.toFixed(0)}
        <span className="ml-2 text-base font-normal text-muted-foreground">wpm</span>
      </div>

      {insight ? (
        <div className="insight-banner panel-raised flex w-full max-w-xl flex-col items-center gap-2 px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground sm:text-base">{insight.headline}</p>
          {insight.action === "practice-weak-keys" ? (
            <button
              type="button"
              onClick={onPracticeWeakKeys}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Fix it now — targeted drill
            </button>
          ) : insight.action === "practice-missed-words" ? (
            <button
              type="button"
              onClick={onPracticeMissedWords}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Fix it now — practice missed words
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Primary Actions directly underneath headline & diagnosis */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          ref={againRef}
          onClick={onRestart}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
        >
          Go again{" "}
          <span className="ml-1 text-xs opacity-75 font-mono">
            ({tabToRestart ? "Tab" : "Esc"})
          </span>
        </button>
        {effectiveMissedWordsCount > 0 ? (
          <button
            type="button"
            onClick={onPracticeMissedWords}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/25 cursor-pointer"
          >
            <Target className="size-4 text-accent" />
            Practice Missed Words ({effectiveMissedWordsCount})
          </button>
        ) : weakKeys3.length > 0 ? (
          <button
            type="button"
            onClick={onPracticeWeakKeys}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/25 cursor-pointer"
          >
            <Target className="size-4 text-accent" />
            Target Weak Keys ({weakKeys3.join(", ")})
          </button>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Too tense?{" "}
        <button
          type="button"
          onClick={onSwitchToShooter}
          className="font-semibold text-primary underline-offset-2 hover:underline cursor-pointer"
        >
          Loosen up in Arcade
        </button>{" "}
        — your weak keys show up there too.
      </p>

      <details className="w-full max-w-xl" open={false}>
        <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
          Full stats
        </summary>
        <div className="mt-2 grid w-full grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Accuracy
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
              {shown.accuracy.toFixed(1)}%
            </span>
          </div>
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Correct
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-success sm:text-lg">
              {shown.correct}
            </span>
          </div>
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Errors
            </span>
            <span
              className={`font-mono text-base font-semibold tabular-nums sm:text-lg ${
                shown.incorrect > 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {shown.incorrect}
            </span>
          </div>
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Raw WPM
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
              {shown.rawWpm.toFixed(0)}
            </span>
          </div>
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Net WPM
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-primary sm:text-lg">
              {shown.adjustedWpm.toFixed(0)}
            </span>
          </div>
          <div className="panel flex flex-col items-center justify-center p-2 text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Consistency
            </span>
            <span className="font-mono text-base font-semibold tabular-nums text-foreground sm:text-lg">
              {shown.consistency.toFixed(0)}%
            </span>
          </div>
        </div>
      </details>

      <Suspense fallback={<ChartSkeleton />}>
        <LazyWpmChart
          samples={samples}
          ghost={ghostSamples}
          targetWpm={targetWpm}
          className="mt-3 w-full"
        />
      </Suspense>
      <ProblemKeys mistakes={mistakes} />
      {Object.keys(allTimeKeys).length > 0 ? (
        <ProblemKeys mistakes={allTimeKeys} limit={8} label="All-time problem keys" />
      ) : null}
      {Object.keys(allTimeKeys).length > 0 || Object.keys(allTimeSpeed).length > 0 ? (
        <KeyHeatmap mistakes={allTimeKeys} speed={allTimeSpeed} className="mt-3" />
      ) : null}
      <AchievementsStrip unlocked={unlockedAchievements} className="mt-3" />
      {drillMode === "quote" && quoteAuthor ? (
        <p className="text-xs italic text-muted-foreground sm:text-sm">— {quoteAuthor}</p>
      ) : null}
    </section>
  );
}
