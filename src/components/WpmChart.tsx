import { useMemo } from "react";
import { Activity, Zap, Target, Award, Clock, Flame } from "lucide-react";
import { ExpandableChartCard } from "@/components/charts/ExpandableChartCard";
import { SvgLineChart, type LineSeriesConfig } from "@/components/charts/LineChart";
import { computeRollingWpmSeries } from "@/lib/typingStats";

interface Props {
  /** Monotonic cumulative net-progress counts sampled once per second (+ optional partial tail). */
  samples: number[];
  errorSeconds?: number[] | undefined;
  elapsedSec?: number | undefined;
  ghost?: number[] | undefined;
  targetWpm?: number | undefined;
  className?: string | undefined;
  defaultOpen?: boolean | undefined;
}

interface WpmPoint extends Record<string, unknown> {
  second: number;
  wpm: number;
  ghostWpm?: number;
  errors: number;
}

export function WpmChart({
  samples,
  errorSeconds,
  elapsedSec,
  ghost,
  targetWpm,
  className = "",
  defaultOpen = false,
}: Props) {
  const hasGhost = Boolean(ghost && ghost.length >= 2);
  const len = hasGhost ? Math.min(samples.length, ghost!.length) : samples.length;

  const data: WpmPoint[] = useMemo(() => {
    if (samples.length < 2) return [];
    const currentSeries = computeRollingWpmSeries(samples, elapsedSec);
    const ghostSeries = hasGhost ? computeRollingWpmSeries(ghost!) : [];

    const errorCounts = new Map<number, number>();
    if (errorSeconds) {
      for (const sec of errorSeconds) {
        if (!Number.isFinite(sec)) continue;
        const bucket = Math.min(len - 1, Math.max(0, Math.floor(sec)));
        errorCounts.set(bucket, (errorCounts.get(bucket) ?? 0) + 1);
      }
    }

    return Array.from({ length: len }, (_, i) => {
      const isLast = i === len - 1;
      const second =
        isLast &&
        typeof elapsedSec === "number" &&
        Number.isFinite(elapsedSec) &&
        elapsedSec > len - 1
          ? Math.round(elapsedSec * 10) / 10
          : i + 1;
      const wpm = currentSeries[i] ?? 0;
      const ghostWpm = hasGhost ? ghostSeries[i] : undefined;

      return {
        second,
        wpm,
        errors: errorCounts.get(i) ?? 0,
        ...(ghostWpm !== undefined ? { ghostWpm } : {}),
      };
    });
  }, [samples, errorSeconds, elapsedSec, ghost, len, hasGhost]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return {
        peakWpm: 0,
        peakSec: 1,
        minWpm: 0,
        minSec: 1,
        avgWpm: 0,
        ghostAvg: undefined,
        totalErrors: 0,
      };
    }
    const wpms = data.map((d) => d.wpm);
    const peakWpm = Math.max(...wpms);
    const peakSec = data.find((d) => d.wpm === peakWpm)?.second ?? 1;
    const minWpm = Math.min(...wpms);
    const minSec = data.find((d) => d.wpm === minWpm)?.second ?? 1;
    const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / (wpms.length || 1));
    const totalErrors = data.reduce((a, b) => a + b.errors, 0);

    let ghostAvg: number | undefined;
    if (hasGhost) {
      const gWpms = data.map((d) => d.ghostWpm ?? 0);
      ghostAvg = Math.round(gWpms.reduce((a, b) => a + b, 0) / (gWpms.length || 1));
    }

    return { peakWpm, peakSec, minWpm, minSec, avgWpm, ghostAvg, totalErrors };
  }, [data, hasGhost]);

  const series: LineSeriesConfig<WpmPoint>[] = useMemo(() => {
    const list: LineSeriesConfig<WpmPoint>[] = [
      {
        key: "wpm",
        label: "Rolling WPM",
        color: "var(--color-primary)",
        showDots: true,
        fillArea: true,
        formatValue: (v) => `${v} WPM`,
      },
    ];
    if (hasGhost) {
      list.push({
        key: "ghostWpm",
        label: "Personal Best",
        color: "var(--color-muted-foreground)",
        dashed: true,
        strokeWidth: 2,
        formatValue: (v) => `${v} WPM`,
      });
    }
    return list;
  }, [hasGhost]);

  if (samples.length < 2) return null;

  const totalSec = data[data.length - 1]?.second ?? data.length;

  return (
    <ExpandableChartCard
      title="Practice Progress"
      badge={`${stats.avgWpm} WPM Avg`}
      className={className}
      defaultOpen={defaultOpen}
      icon={
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="size-4" />
        </div>
      }
      headerRight={
        <div className="hidden items-center gap-1.5 text-[13px] sm:flex">
          <span className="text-muted-foreground">Peak:</span>
          <span className="font-mono font-bold tabular-nums text-accent">{stats.peakWpm} WPM</span>
        </div>
      }
      statsGrid={(isExpanded) =>
        isExpanded ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Activity className="size-3 text-primary" /> Average pace
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
                {stats.avgWpm}{" "}
                <span className="font-sans text-[13px] font-normal text-muted-foreground">WPM</span>
              </span>
            </div>

            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Zap className="size-3 text-accent" /> Peak burst
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-accent">
                {stats.peakWpm}{" "}
                <span className="font-sans text-[13px] font-normal text-muted-foreground">
                  at {stats.peakSec}s
                </span>
              </span>
            </div>

            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Target className="size-3 text-primary" /> Target
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
                {targetWpm ? (
                  <>
                    {stats.avgWpm >= targetWpm ? (
                      <span className="text-accent">+{stats.avgWpm - targetWpm}</span>
                    ) : (
                      <span className="text-primary">-{targetWpm - stats.avgWpm}</span>
                    )}{" "}
                    <span className="font-sans text-[13px] font-normal text-muted-foreground">
                      vs {targetWpm}
                    </span>
                  </>
                ) : (
                  <span className="font-sans text-[13px] font-normal text-muted-foreground">
                    None
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Award className="size-3 text-muted-foreground" /> Lowest dip
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-muted-foreground">
                {stats.minWpm}{" "}
                <span className="font-sans text-[13px] font-normal text-muted-foreground">
                  at {stats.minSec}s
                </span>
              </span>
            </div>

            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Clock className="size-3 text-primary" /> Total time
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
                {totalSec}s
              </span>
            </div>

            <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
              <span className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
                <Flame className="size-3 text-primary" /> Ghost avg (best)
              </span>
              <span className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
                {stats.ghostAvg !== undefined ? `${stats.ghostAvg} WPM` : "None"}
              </span>
            </div>
          </div>
        ) : null
      }
      footer={(isExpanded) =>
        isExpanded ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1 w-3.5 rounded-full bg-primary" /> Rolling WPM
              </span>
              {hasGhost && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-muted-foreground" />{" "}
                  Personal Best
                </span>
              )}
              {stats.totalErrors > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-destructive" /> Errors (
                  {stats.totalErrors})
                </span>
              )}
              {typeof targetWpm === "number" && targetWpm > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-3.5 border-b-2 border-dotted border-primary/70" />{" "}
                  Target ({targetWpm} WPM)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[13px] tabular-nums text-muted-foreground">
                {totalSec}s duration
              </span>
              <span className="hidden text-[13px] text-primary sm:inline-block">
                (Click to collapse)
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {(isExpanded) => (
        <SvgLineChart
          data={data}
          xKey="second"
          xLabel="Time (seconds)"
          series={series}
          errorKey="errors"
          ariaCaption="Rolling WPM and error timeline"
          expanded={isExpanded}
          formatXTick={(v) => `${v}s`}
          formatTooltipTitle={(row) => `Time: ${row.second}s`}
          referenceLine={
            typeof targetWpm === "number" && targetWpm > 0
              ? {
                  value: targetWpm,
                  label: `Target ${targetWpm} WPM`,
                  color: "var(--color-primary)",
                }
              : undefined
          }
        />
      )}
    </ExpandableChartCard>
  );
}
