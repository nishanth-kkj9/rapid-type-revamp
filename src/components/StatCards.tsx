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
  restartArmed?: boolean | undefined;
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
  restartArmed = false,
}: StatCardsProps) {
  const hideLive = !showLiveWpm && !finished;
  const wordsDone = Math.min(wordCount, typed.split(/\s+/).filter(Boolean).length);
  const quotePct = Math.min(100, Math.round((typed.length / (textLength || 1)) * 100));
  const showActive = running || finished;
  const wpmText = hideLive ? "•••" : finished || (running && settled) ? shown.wpm.toFixed(0) : "—";
  const accText = hideLive ? "•••" : showActive ? `${shown.accuracy.toFixed(0)}%` : "—%";
  const timeLeft = finished ? 0 : Math.ceil(remaining);
  const barWidth = finished && drillMode === "time" ? 100 : progress;
  const lengthValue =
    drillMode === "words"
      ? `${wordsDone} / ${wordCount}`
      : drillMode === "quote"
        ? `${quotePct}%`
        : `${timeLeft}s`;
  const lengthLabel = drillMode === "words" ? "words" : drillMode === "quote" ? "progress" : "left";
  const lengthClass =
    drillMode === "time"
      ? running && !finished && timeLeft <= 5
        ? "text-destructive"
        : "text-primary"
      : "text-foreground";

  return (
    <div className="mt-4">
      <div
        role="status"
        aria-label="Live metrics"
        className="flex h-10 items-center justify-between gap-2 overflow-hidden rounded-xl border border-border/70 bg-card/75 px-3 text-[13px] sm:gap-4 sm:px-4 sm:text-sm"
      >
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className={`font-mono font-bold tabular-nums ${lengthClass}`}>{lengthValue}</span>
          <span className="text-[13px] text-muted-foreground">{lengthLabel}</span>
        </div>

        {restartArmed ? (
          <span className="truncate text-[13px] font-medium text-accent">
            press again to restart
          </span>
        ) : null}

        <div className="flex items-center gap-3 whitespace-nowrap sm:gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold tabular-nums text-primary">{wpmText}</span>
            <span className="text-[13px] text-muted-foreground">WPM</span>
          </div>
          <span aria-hidden="true" className="text-border">
            ·
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono font-bold tabular-nums text-foreground">{accText}</span>
            <span className="text-[13px] text-muted-foreground">acc</span>
          </div>
        </div>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
