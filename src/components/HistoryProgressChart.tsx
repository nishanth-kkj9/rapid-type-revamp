import { useMemo } from "react";
import { SvgLineChart, type LineSeriesConfig } from "@/components/charts/LineChart";
import { downsampleProgressPoints } from "@/lib/statsAnalytics";
import {
  computeHistoryProgressSeries,
  formatModeLabel,
  type HistoryEntry,
  type HistoryProgressPoint,
} from "@/lib/typingStats";

interface HistoryProgressChartProps {
  entries: readonly HistoryEntry[];
  className?: string | undefined;
}

const PROGRESS_SERIES: LineSeriesConfig<HistoryProgressPoint>[] = [
  {
    key: "wpm",
    label: "Run WPM",
    color: "var(--color-primary)",
    showDots: true,
    fillArea: true,
    formatValue: (v) => `${v} WPM`,
  },
  {
    key: "movingAvgWpm",
    label: "7-Run Moving Avg",
    color: "var(--color-accent)",
    strokeWidth: 2.5,
    formatValue: (v) => `${v} WPM`,
  },
  {
    key: "accuracy",
    label: "Accuracy",
    color: "#38bdf8",
    axis: "right",
    dashed: true,
    strokeWidth: 1.5,
    formatValue: (v) => `${v}%`,
  },
];

export function HistoryProgressChart({ entries, className = "" }: HistoryProgressChartProps) {
  const fullSeries = useMemo(() => computeHistoryProgressSeries(entries, 7), [entries]);
  const seriesData = useMemo(() => downsampleProgressPoints(fullSeries, 120), [fullSeries]);

  if (seriesData.length < 2) return null;

  return (
    <div className={`rounded-xl border border-border/70 bg-card/70 p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progress Over Time
          </h3>
          <p className="text-[11px] text-muted-foreground">
            WPM, 7-run moving average, and accuracy across {fullSeries.length.toLocaleString()} runs
            {seriesData.length < fullSeries.length ? ` (${seriesData.length} sampled points)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-3 rounded-full bg-primary" /> WPM
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1 w-3 rounded-full bg-accent" /> 7-run avg
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-3 border-b-2 border-dashed"
              style={{ borderColor: "#38bdf8" }}
            />{" "}
            Accuracy
          </span>
        </div>
      </div>

      <div className="h-48 w-full sm:h-56">
        <SvgLineChart
          data={seriesData}
          xKey="index"
          xLabel="Chronological runs"
          series={PROGRESS_SERIES}
          ariaCaption="WPM, 7-run moving average, and accuracy over time"
          formatXTick={(v) => `#${v}`}
          formatTooltipTitle={(row) =>
            `${new Date(row.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })} · ${formatModeLabel(row.mode)} (${row.difficulty})`
          }
        />
      </div>
    </div>
  );
}
