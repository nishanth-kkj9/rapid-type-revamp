import { useMemo } from "react";
import {
  Activity,
  Clock,
  Crosshair,
  Flame,
  Gauge,
  Keyboard,
  Play,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { DailyGoal } from "@/components/DailyGoal";
import { HistoryPanel } from "@/components/HistoryPanel";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { PanelSkeleton } from "@/components/Skeletons";
import type { DailyState } from "@/lib/daily";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import {
  computeArcadePersonalBests,
  computeStatsSummary,
  formatTotalDuration,
} from "@/lib/statsAnalytics";
import type { HistoryEntry } from "@/lib/typingStats";

interface StatsPageProps {
  history: HistoryEntry[];
  historyReady: boolean;
  daily: DailyState | null;
  allTimeKeys: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  layout: KeyboardLayoutId;
  standard: KeyboardStandard;
  onClearHistory: (mode?: "all" | "drill" | "shooter") => void;
  onImportHistory: (entries: HistoryEntry[]) => void;
  onDeleteRun: (id: string) => Promise<HistoryEntry | null>;
  onRestoreRun: (entry: HistoryEntry) => Promise<void>;
  onOpenGoalSettings: () => void;
  onStartRun: () => void;
}

export function StatsPage({
  history,
  historyReady,
  daily,
  allTimeKeys,
  allTimeSpeed,
  layout,
  standard,
  onClearHistory,
  onImportHistory,
  onDeleteRun,
  onRestoreRun,
  onOpenGoalSettings,
  onStartRun,
}: StatsPageProps) {
  const summary = useMemo(() => computeStatsSummary(history), [history]);
  const arcadeBests = useMemo(() => computeArcadePersonalBests(history), [history]);

  return (
    <section aria-label="Statistics and practice progress" className="mt-4 space-y-6">
      <DailyGoal daily={daily} onOpenGoalSettings={onOpenGoalSettings} />

      {!historyReady ? (
        <PanelSkeleton lines={5} />
      ) : history.length === 0 ? (
        <div
          aria-label="Empty statistics state"
          className="panel flex flex-col items-center gap-4 px-6 py-12 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <TrendingUp className="size-6" aria-hidden="true" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h2 className="font-mono text-lg font-bold tracking-tight text-foreground">
              No runs recorded yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete your first typing drill or arcade game to unlock speed trends, personal
              bests, keyboard heatmaps, and your 26-week activity calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartRun}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="size-4" aria-hidden="true" />
            Start a run
          </button>
        </div>
      ) : (
        <>
          <div aria-label="Summary statistics" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Activity className="size-3.5 text-primary" aria-hidden="true" />
                Total Runs
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-foreground">
                {summary.totalRuns.toLocaleString()}
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                {summary.drillRuns} practice · {summary.shooterRuns} arcade
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3.5 text-primary" aria-hidden="true" />
                Time Typed
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-foreground">
                {formatTotalDuration(summary.totalElapsedSec)}
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                Active practice &amp; arcade time
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Gauge className="size-3.5 text-primary" aria-hidden="true" />
                Best WPM
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-primary">
                {summary.bestWpm > 0 ? summary.bestWpm : "—"}
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Standard practice drills
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-primary" aria-hidden="true" />
                Avg Accuracy
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-foreground">
                {summary.avgAccuracyLast20 !== null ? `${summary.avgAccuracyLast20}%` : "—"}
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                Last {Math.min(20, summary.totalRuns)} runs
              </p>
            </div>
          </div>

          <section aria-label="Arcade personal bests" className="panel p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Crosshair className="size-3.5 text-primary" aria-hidden="true" />
                Arcade
              </h3>
              <span className="font-mono text-xs text-muted-foreground">
                {arcadeBests.totalGames > 0
                  ? `${arcadeBests.totalGames} Word Shooter game${arcadeBests.totalGames === 1 ? "" : "s"}`
                  : "No Word Shooter games yet"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Trophy className="size-3.5 text-primary" aria-hidden="true" />
                  Best Score
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">
                  {arcadeBests.bestScore > 0 ? arcadeBests.bestScore.toLocaleString() : "—"}
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">Standard runs</p>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Zap className="size-3.5 text-accent" aria-hidden="true" />
                  Best Level
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                  {arcadeBests.totalGames > 0 ? `Lvl ${arcadeBests.bestLevel}` : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Flame className="size-3.5 text-primary" aria-hidden="true" />
                  Best Streak
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                  {arcadeBests.totalGames > 0 ? `${arcadeBests.bestStreak}x` : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Shield className="size-3.5 text-destructive" aria-hidden="true" />
                  Bosses Defeated
                </div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-foreground">
                  {arcadeBests.totalGames > 0 ? arcadeBests.bossesDefeated.toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </section>

          <ActivityCalendar history={history} />

          <section aria-label="Lifetime keyboard heatmap" className="panel p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Keyboard className="size-3.5 text-primary" aria-hidden="true" />
                Lifetime Keyboard Heatmap ({layout.toUpperCase()} · {standard.toUpperCase()})
              </h3>
            </div>
            <KeyHeatmap
              mistakes={allTimeKeys}
              speed={allTimeSpeed}
              layout={layout}
              standard={standard}
            />
          </section>

          <HistoryPanel
            history={history}
            onClear={onClearHistory}
            onImportHistory={onImportHistory}
            onDeleteRun={onDeleteRun}
            onRestoreRun={onRestoreRun}
            onStartRun={onStartRun}
          />
        </>
      )}
    </section>
  );
}
