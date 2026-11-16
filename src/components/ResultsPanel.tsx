import { lazy, Suspense, useState, type RefObject } from "react";
import { Check, Copy, ImageDown, Target } from "lucide-react";
import { toast } from "sonner";
import type { RunSlowWord, RunStats } from "@/lib/typingStats";
import type { DrillMode } from "@/lib/drillSettings";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import type { AchievementState } from "@/lib/achievements";
import type { Insight } from "@/lib/insights";
import { copyResultText, downloadResultCardImage } from "@/lib/shareResult";
import { ResultsHeadlineRow } from "@/components/ResultsHeadlineRow";
import { ResultsTabs } from "@/components/ResultsTabs";
import { ChartSkeleton } from "@/components/Skeletons";

const LazyWpmChart = lazy(() =>
  import("@/components/WpmChart").then((m) => ({ default: m.WpmChart })),
);

export interface DrillResultData {
  stats: RunStats;
  isRecord: boolean;
  recordDelta: number | null;
  targetWpm: number;
  insight: Insight | null;
  effectiveMissedWordsCount: number;
  weakKeys3: string[];
  slowKeys3: string[];
  tabToRestart: boolean;
  samples: number[];
  errorSeconds: number[];
  elapsedSec: number;
  ghostSamples: number[] | undefined;
  mistakes: Record<string, number>;
  slowestWords: RunSlowWord[];
  mostMissedWords: { word: string; errors: number }[];
  allTimeKeys: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  unlockedAchievements: AchievementState["unlocked"];
  achievementCounters?: AchievementState["counters"] | undefined;
  drillMode: DrillMode;
  modeKey: string;
  difficulty: string;
  quoteAuthor: string | null;
  keyboardLayout: KeyboardLayoutId;
  keyboardStandard: KeyboardStandard;
}

export interface ResultsPanelProps {
  resultsRef: RefObject<HTMLElement | null>;
  againRef: RefObject<HTMLButtonElement | null>;
  result: DrillResultData;
  onRestart: () => void;
  onPracticeWeakKeys: () => void;
  onPracticeSlowKeys?: (() => void) | undefined;
  onPracticeMissedWords: () => void;
  onSwitchToShooter: () => void;
  onOpenAchievements?: (() => void) | undefined;
}

export function ResultsPanel({
  resultsRef,
  againRef,
  result,
  onRestart,
  onPracticeWeakKeys,
  onPracticeSlowKeys,
  onPracticeMissedWords,
  onSwitchToShooter,
  onOpenAchievements,
}: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);
  const {
    stats,
    isRecord,
    recordDelta,
    targetWpm,
    insight,
    effectiveMissedWordsCount,
    weakKeys3,
    slowKeys3,
    tabToRestart,
    samples,
    errorSeconds,
    elapsedSec,
    ghostSamples,
    mistakes,
    slowestWords,
    mostMissedWords,
    allTimeKeys,
    allTimeSpeed,
    unlockedAchievements,
    achievementCounters,
    drillMode,
    modeKey,
    difficulty,
    quoteAuthor,
    keyboardLayout,
    keyboardStandard,
  } = result;

  const sharePayload = {
    stats,
    modeKey,
    difficulty,
    isRecord,
    quoteAuthor,
  };

  const handleCopyResult = () => {
    void copyResultText(sharePayload).then((ok) => {
      if (ok) {
        setCopied(true);
        toast.success("Result copied to clipboard.");
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Clipboard unavailable in this browser.");
      }
    });
  };

  const handleDownloadImage = () => {
    void downloadResultCardImage(sharePayload).then((ok) => {
      if (ok) toast.success("Result card PNG downloaded.");
      else toast.error("Could not render result image.");
    });
  };

  return (
    <section
      ref={resultsRef}
      tabIndex={-1}
      aria-label="Run results"
      className="panel relative mt-4 flex flex-col items-center justify-start gap-4 p-6 text-center focus-visible:outline-none sm:p-8"
    >
      <p role="status" aria-live="polite" className="sr-only">
        {`Run finished: ${stats.wpm.toFixed(0)} WPM, ${stats.accuracy.toFixed(0)} percent accuracy, ${stats.consistency.toFixed(0)} percent consistency.${
          isRecord ? " New personal best." : ""
        }${stats.wpm >= targetWpm ? " Target met." : ""}`}
      </p>
      {(isRecord || stats.wpm >= targetWpm) && (
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          {isRecord ? (
            <span className="text-accent">
              New personal best
              {recordDelta != null && recordDelta > 0 ? ` (+${recordDelta} WPM)` : ""}
            </span>
          ) : null}
          {isRecord && stats.wpm >= targetWpm ? (
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          ) : null}
          {stats.wpm >= targetWpm ? <span className="text-primary">Target met</span> : null}
        </div>
      )}

      <ResultsHeadlineRow stats={stats} />

      {insight ? (
        <div className="insight-banner panel-raised flex w-full max-w-2xl flex-col items-center gap-2 px-4 py-3">
          <p className="text-sm leading-relaxed text-foreground sm:text-base">{insight.headline}</p>
          {insight.action === "practice-weak-keys" ? (
            <button
              type="button"
              onClick={onPracticeWeakKeys}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Fix it now — targeted drill
            </button>
          ) : insight.action === "practice-missed-words" ? (
            <button
              type="button"
              onClick={onPracticeMissedWords}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Fix it now — practice missed words
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          ref={againRef}
          onClick={onRestart}
          className="cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go again{" "}
          <span className="ml-1 font-mono text-xs opacity-75">
            ({tabToRestart ? "Tab" : "Esc"})
          </span>
        </button>
        {effectiveMissedWordsCount > 0 ? (
          <button
            type="button"
            onClick={onPracticeMissedWords}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/25"
          >
            <Target className="size-4 text-accent" />
            Practice Missed Words ({effectiveMissedWordsCount})
          </button>
        ) : weakKeys3.length > 0 ? (
          <button
            type="button"
            onClick={onPracticeWeakKeys}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/25"
          >
            <Target className="size-4 text-accent" />
            Target Weak Keys ({weakKeys3.join(", ")})
          </button>
        ) : null}
        {slowKeys3.length > 0 && onPracticeSlowKeys ? (
          <button
            type="button"
            onClick={onPracticeSlowKeys}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
          >
            <Target className="size-4 text-primary" />
            Slow Keys ({slowKeys3.join(", ")})
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopyResult}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy result"}
        </button>
        <button
          type="button"
          onClick={handleDownloadImage}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ImageDown className="size-3.5" />
          Download PNG
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Too tense?{" "}
        <button
          type="button"
          onClick={onSwitchToShooter}
          className="cursor-pointer font-semibold text-primary underline-offset-2 hover:underline"
        >
          Loosen up in Arcade
        </button>{" "}
        — your weak keys show up there too.
      </p>

      <Suspense fallback={<ChartSkeleton />}>
        <LazyWpmChart
          samples={samples}
          errorSeconds={errorSeconds}
          elapsedSec={elapsedSec}
          ghost={ghostSamples}
          targetWpm={targetWpm}
          className="mt-1 w-full"
        />
      </Suspense>

      <ResultsTabs
        mistakes={mistakes}
        allTimeKeys={allTimeKeys}
        allTimeSpeed={allTimeSpeed}
        slowestWords={slowestWords}
        mostMissedWords={mostMissedWords}
        unlockedAchievements={unlockedAchievements}
        achievementCounters={achievementCounters}
        keyboardLayout={keyboardLayout}
        keyboardStandard={keyboardStandard}
        onPracticeMissedWords={effectiveMissedWordsCount > 0 ? onPracticeMissedWords : undefined}
        onOpenAchievements={onOpenAchievements}
      />

      {drillMode === "quote" && quoteAuthor ? (
        <p className="text-xs italic text-muted-foreground sm:text-sm">— {quoteAuthor}</p>
      ) : null}
    </section>
  );
}
