import { lazy, Suspense, useState, type RefObject } from "react";
import { Check, Copy, RotateCcw, Target } from "lucide-react";
import { toast } from "sonner";
import type { RunSlowWord, RunStats } from "@/lib/typingStats";
import { QUICK_RESTART_LABELS, type DrillMode, type QuickRestartKey } from "@/lib/drillSettings";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import type { AchievementState } from "@/lib/achievements";
import type { Insight } from "@/lib/insights";
import { copyResultText } from "@/lib/shareResult";
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
  quickRestart: QuickRestartKey;
  repeated?: boolean | undefined;
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
  onRepeatSameText: () => void;
  onPracticeWeakKeys: () => void;
  onPracticeSlowKeys?: (() => void) | undefined;
  onPracticeMissedWords: () => void;
  onOpenAchievements?: (() => void) | undefined;
}

export function ResultsPanel({
  resultsRef,
  againRef,
  result,
  onRestart,
  onRepeatSameText,
  onPracticeWeakKeys,
  onPracticeSlowKeys,
  onPracticeMissedWords,
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
    quickRestart,
    repeated,
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

  const handleCopyResult = () => {
    void copyResultText({
      stats,
      modeKey,
      difficulty,
      isRecord,
      quoteAuthor,
    }).then((ok) => {
      if (ok) {
        setCopied(true);
        toast.success("Result copied to clipboard.");
        window.setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Clipboard unavailable in this browser.");
      }
    });
  };

  const practiceAction =
    effectiveMissedWordsCount > 0
      ? {
          label: `Practice missed words (${effectiveMissedWordsCount})`,
          onClick: onPracticeMissedWords,
        }
      : weakKeys3.length > 0
        ? {
            label: `Practice weak keys (${weakKeys3.join(", ")})`,
            onClick: onPracticeWeakKeys,
          }
        : slowKeys3.length > 0 && onPracticeSlowKeys
          ? {
              label: `Practice slow keys (${slowKeys3.join(", ")})`,
              onClick: onPracticeSlowKeys,
            }
          : null;

  return (
    <section
      ref={resultsRef}
      tabIndex={-1}
      aria-label="Run results"
      className="panel relative mt-4 flex flex-col items-center justify-start gap-4 p-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-8"
    >
      <p role="status" aria-live="polite" className="sr-only">
        {`Run finished: ${stats.wpm.toFixed(0)} WPM, ${stats.accuracy.toFixed(0)} percent accuracy, ${stats.consistency.toFixed(0)} percent consistency.${
          isRecord ? " New personal best." : ""
        }${stats.wpm >= targetWpm ? " Target met." : ""}`}
      </p>
      {(isRecord || stats.wpm >= targetWpm || repeated) && (
        <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          {isRecord ? (
            <span className="text-accent">
              New personal best
              {recordDelta != null && recordDelta > 0 ? ` (+${recordDelta} WPM)` : ""}
            </span>
          ) : null}
          {repeated ? (
            <span className="text-muted-foreground">Repeated text · excluded from PBs</span>
          ) : null}
          {(isRecord || repeated) && stats.wpm >= targetWpm ? (
            <span aria-hidden="true" className="text-border">
              ·
            </span>
          ) : null}
          {stats.wpm >= targetWpm ? <span className="text-primary">Target met</span> : null}
        </div>
      )}

      <ResultsHeadlineRow stats={stats} />

      {insight ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {insight.headline}
        </p>
      ) : null}

      <div
        className="flex flex-wrap items-center justify-center gap-2"
        data-testid="results-actions"
      >
        <button
          type="button"
          ref={againRef}
          onClick={onRestart}
          className="cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go again
          {quickRestart !== "off" ? (
            <span className="ml-1 font-mono text-xs opacity-75">
              ({QUICK_RESTART_LABELS[quickRestart]})
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onRepeatSameText}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw className="size-3.5 text-primary" />
          Repeat this text
          <span className="ml-0.5 hidden font-mono text-xs text-muted-foreground sm:inline">
            (Shift+Enter)
          </span>
        </button>
        {practiceAction ? (
          <button
            type="button"
            onClick={practiceAction.onClick}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Target className="size-4 text-primary" />
            {practiceAction.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleCopyResult}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy result"}
        </button>
      </div>

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
        onOpenAchievements={onOpenAchievements}
      />

      {drillMode === "quote" && quoteAuthor ? (
        <p className="text-xs italic text-muted-foreground sm:text-sm">— {quoteAuthor}</p>
      ) : null}
    </section>
  );
}
