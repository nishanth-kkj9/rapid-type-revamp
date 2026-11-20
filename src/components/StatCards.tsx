import type { DrillMode, WordCountOption } from "@/lib/drillSettings";
import type { RunStats } from "@/lib/typingStats";

interface StatCardsProps {
  shown: RunStats;
  running: boolean;
  finished: boolean;
  settled: boolean;
  showLiveWpm: boolean;
  drillMode: DrillMode;
  remaining: number;
  wordCount: WordCountOption;
  typed: string;
  textLength: number;
  progress: number;
}

export function StatCards({
  shown,
  running,
  finished,
  settled,
  showLiveWpm,
  drillMode,
  remaining,
  wordCount,
  typed,
  textLength,
  progress,
}: StatCardsProps) {
  if (!running || finished) return null;

  const hideLive = !showLiveWpm;
  const wordsDone = Math.min(wordCount, typed.split(/\s+/).filter(Boolean).length);
  const quotePct = Math.min(100, Math.round((typed.length / (textLength || 1)) * 100));

  return (
    <div className="mt-4">
      <div
        role="status"
        aria-label="Live metrics"
        className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/75 px-4 py-2 font-mono text-sm tabular-nums"
      >
        <div className="flex items-baseline gap-1.5">
          {drillMode === "words" ? (
            <>
              <span className="font-bold text-foreground">
                {wordsDone} / {wordCount}
              </span>
              <span className="text-xs text-muted-foreground">words</span>
            </>
          ) : drillMode === "quote" ? (
            <>
              <span className="font-bold text-foreground">{quotePct}%</span>
              <span className="text-xs text-muted-foreground">progress</span>
            </>
          ) : (
            <>
              <span className={`font-bold ${remaining <= 5 ? "text-destructive" : "text-primary"}`}>
                {Math.ceil(remaining)}s
              </span>
              <span className="text-xs text-muted-foreground">left</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-primary">
              {hideLive ? "•••" : settled ? shown.wpm.toFixed(0) : "—"}
            </span>
            <span className="text-xs text-muted-foreground">WPM</span>
          </div>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-foreground">
              {hideLive ? "•••" : `${shown.accuracy.toFixed(0)}%`}
            </span>
            <span className="text-xs text-muted-foreground">acc</span>
          </div>
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
