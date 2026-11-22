import type { RunStats } from "@/lib/typingStats";

interface ResultsHeadlineRowProps {
  stats: RunStats;
}

export function ResultsHeadlineRow({ stats }: ResultsHeadlineRowProps) {
  const uncorrected = stats.uncorrectedErrors ?? stats.incorrect;

  return (
    <>
      <div className="grid w-full max-w-2xl grid-cols-2 divide-y divide-border/60 rounded-xl border border-border/70 bg-card/60 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="flex flex-col items-center justify-center px-3 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">WPM</span>
          <span className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-primary sm:text-4xl">
            {stats.wpm.toFixed(0)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">Accuracy</span>
          <span className="mt-0.5 font-mono text-3xl font-bold tabular-nums text-foreground sm:text-4xl">
            {stats.accuracy.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">Raw WPM</span>
          <span className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
            {stats.rawWpm.toFixed(0)}
          </span>
        </div>
        <div className="flex flex-col items-center justify-center px-3 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">Consistency</span>
          <span className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
            {stats.consistency.toFixed(0)}%
          </span>
        </div>
      </div>

      <p className="text-[13px] tabular-nums text-muted-foreground">
        {stats.correct} correct · {stats.incorrect} key {stats.incorrect === 1 ? "error" : "errors"}{" "}
        · {uncorrected} uncorrected · {stats.adjustedWpm.toFixed(0)} net wpm
      </p>
    </>
  );
}
