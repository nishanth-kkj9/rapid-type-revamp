import { StatCard } from "@/components/StatCard";
import type { DrillMode, WordCountOption } from "@/lib/drillSettings";
import type { RunStats } from "@/lib/typingStats";

interface StatCardsProps {
  shown: RunStats;
  running: boolean;
  finished: boolean;
  settled: boolean;
  showLiveWpm: boolean;
  drillMode: DrillMode;
  duration: number;
  remaining: number;
  wordCount: WordCountOption;
  typed: string;
  textLength: number;
  quoteAuthor: string | null;
  samplesCount: number;
  previousBest: number;
  progress: number;
}

export function StatCards({
  shown,
  running,
  finished,
  settled,
  showLiveWpm,
  drillMode,
  duration,
  remaining,
  wordCount,
  typed,
  textLength,
  quoteAuthor,
  samplesCount,
  previousBest,
  progress,
}: StatCardsProps) {
  const hideLive = !showLiveWpm && running && !finished;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="WPM"
          value={hideLive ? "•••" : settled || finished ? shown.wpm.toFixed(0) : "—"}
          emphasis
          hint={
            hideLive
              ? "hidden during test"
              : settled || finished
                ? `raw ${shown.rawWpm.toFixed(0)}`
                : "start typing"
          }
        />
        <StatCard
          label="Accuracy"
          value={hideLive ? "•••" : `${shown.accuracy.toFixed(0)}%`}
          hint={hideLive ? "hidden during test" : `${shown.incorrect} errors`}
        />
        <StatCard
          label={drillMode === "words" ? "Words" : drillMode === "quote" ? "Quote" : "Time left"}
          value={
            drillMode === "words"
              ? `${finished ? wordCount : Math.min(wordCount, typed.split(/\s+/).filter(Boolean).length)} / ${wordCount}`
              : drillMode === "quote"
                ? `${finished ? 100 : Math.min(100, Math.round((typed.length / (textLength || 1)) * 100))}%`
                : `${Math.ceil(finished ? 0 : remaining)}s`
          }
          hint={
            drillMode === "words"
              ? `${wordCount} words quota`
              : drillMode === "quote"
                ? quoteAuthor
                  ? `by ${quoteAuthor.split(" (")[0]}`
                  : "quote drill"
                : `${duration}s run`
          }
          warn={drillMode === "time" && running && !finished && remaining <= 5}
        />
        <StatCard
          label="Consistency"
          value={
            hideLive
              ? "•••"
              : samplesCount >= 3 || finished
                ? `${shown.consistency.toFixed(0)}%`
                : "—"
          }
          hint={
            hideLive
              ? "hidden during test"
              : previousBest
                ? `best ${previousBest.toFixed(0)} wpm`
                : "no record yet"
          }
        />
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </>
  );
}
