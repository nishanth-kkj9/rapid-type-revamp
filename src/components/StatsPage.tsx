import { useMemo } from "react";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { DailyGoal } from "@/components/DailyGoal";
import { HistoryPanel } from "@/components/HistoryPanel";
import { HistoryProgressChart } from "@/components/HistoryProgressChart";
import { KeyHeatmap } from "@/components/KeyHeatmap";
import { PanelSkeleton } from "@/components/Skeletons";
import type { DailyState } from "@/lib/daily";
import type { KeyboardLayoutId, KeyboardStandard } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import { computeStatsSummary, formatTotalDuration } from "@/lib/statsAnalytics";
import { filterVisibleHistory, type HistoryEntry } from "@/lib/typingStats";

interface StatsPageProps {
  history: HistoryEntry[];
  historyReady: boolean;
  daily: DailyState | null;
  allTimeKeys: Record<string, number>;
  allTimeSpeed: KeySpeedMap;
  layout: KeyboardLayoutId;
  standard: KeyboardStandard;
  onClearHistory: (mode?: "all" | "drill") => void;
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
  const visibleHistory = useMemo(() => filterVisibleHistory(history), [history]);
  const summary = useMemo(() => computeStatsSummary(visibleHistory), [visibleHistory]);

  return (
    <section aria-label="Statistics and practice progress" className="mt-4 space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Stats</h2>

      <DailyGoal daily={daily} onOpenGoalSettings={onOpenGoalSettings} />

      {!historyReady ? (
        <PanelSkeleton lines={5} />
      ) : visibleHistory.length === 0 ? (
        <div
          aria-label="Empty statistics state"
          className="panel flex flex-col items-center gap-4 px-6 py-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            No runs yet. Finish one to see your trends.
          </p>
          <button
            type="button"
            onClick={onStartRun}
            className="min-h-10 cursor-pointer rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start a run
          </button>
        </div>
      ) : (
        <>
          <div
            aria-label="Summary statistics"
            className="panel grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">Runs</span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {summary.totalRuns.toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">Time typed</span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {formatTotalDuration(summary.totalElapsedSec)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">Best WPM</span>
              <span className="font-mono text-lg font-bold tabular-nums text-primary">
                {summary.bestWpm > 0 ? summary.bestWpm : "—"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-medium text-muted-foreground">
                Avg accuracy (last 20)
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {summary.avgAccuracyLast20 !== null ? `${summary.avgAccuracyLast20}%` : "—"}
              </span>
            </div>
          </div>

          <HistoryProgressChart entries={visibleHistory} />

          <ActivityCalendar history={visibleHistory} />

          <section aria-label="Lifetime keyboard heatmap" className="panel p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Lifetime keyboard heatmap ({layout.toUpperCase()} · {standard.toUpperCase()})
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
