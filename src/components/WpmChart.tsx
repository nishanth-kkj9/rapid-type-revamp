import { useMemo } from "react";
import { Activity, Zap, Target, Award, Clock, Flame } from "lucide-react";
import { ExpandableChartCard } from "@/components/charts/ExpandableChartCard";
import { SvgLineChart, type LineSeriesConfig } from "@/components/charts/LineChart";

interface Props {
  /** Cumulative correct-character counts sampled once per second. */
  samples: number[];
  ghost?: number[] | undefined;
  targetWpm?: number | undefined;
  className?: string | undefined;
  defaultOpen?: boolean | undefined;
}

interface WpmPoint extends Record<string, unknown> {
  second: number;
  wpm: number;
  ghostWpm?: number;
}

export function WpmChart({
  samples,
  ghost,
  targetWpm,
  className = "",
  defaultOpen = false,
}: Props) {
  const hasGhost = Boolean(ghost && ghost.length >= 2);
  const len = hasGhost ? Math.min(samples.length, ghost!.length) : samples.length;

  const data: WpmPoint[] = useMemo(() => {
    if (samples.length < 2) return [];
    return Array.from({ length: len }, (_, i) => {
      const curVal = samples[i] ?? 0;
      const curPrev = i === 0 ? 0 : (samples[i - 1] ?? 0);
      const delta = curVal - curPrev;
      const wpm = Math.max(0, Math.round((delta / 5) * 60));

      let ghostWpm: number | undefined;
      if (hasGhost) {
        const gVal = ghost![i] ?? 0;
        const gPrev = i === 0 ? 0 : (ghost![i - 1] ?? 0);
        const gDelta = gVal - gPrev;
        ghostWpm = Math.max(0, Math.round((gDelta / 5) * 60));
      }

      return {
        second: i + 1,
        wpm,
        ...(ghostWpm !== undefined ? { ghostWpm } : {}),
      };
    });
  }, [samples, ghost, len, hasGhost]);

  const stats = useMemo(() => {
    if (data.length === 0) {
      return { peakWpm: 0, peakSec: 1, minWpm: 0, minSec: 1, avgWpm: 0, ghostAvg: undefined };
    }
    const wpms = data.map((d) => d.wpm);
    const peakWpm = Math.max(...wpms);
    const peakSec = data.find((d) => d.wpm === peakWpm)?.second ?? 1;
    const minWpm = Math.min(...wpms);
    const minSec = data.find((d) => d.wpm === minWpm)?.second ?? 1;
    const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / (wpms.length || 1));

    let ghostAvg: number | undefined;
    if (hasGhost) {
      const gWpms = data.map((d) => d.ghostWpm ?? 0);
      ghostAvg = Math.round(gWpms.reduce((a, b) => a + b, 0) / (gWpms.length || 1));
    }

    return { peakWpm, peakSec, minWpm, minSec, avgWpm, ghostAvg };
  }, [data, hasGhost]);

  const series: LineSeriesConfig<WpmPoint>[] = useMemo(() => {
    const list: LineSeriesConfig<WpmPoint>[] = [
      {
        key: "wpm",
        label: "Current Run",
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

  return (
    <ExpandableChartCard
      title="Timed Drill Progress"
      badge={`${stats.avgWpm} WPM Avg`}
      className={className}
      defaultOpen={defaultOpen}
      icon={
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Activity className="size-4" />
        </div>
      }
      headerRight={
        <div className="hidden items-center gap-1.5 font-mono text-xs sm:flex">
          <span className="text-muted-foreground">Peak:</span>
          <span className="font-bold text-accent">{stats.peakWpm} WPM</span>
        </div>
      }
      statsGrid={(isExpanded) => (
        <div
          className={`grid gap-2 pt-3 ${
            isExpanded ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Activity className="size-3 text-primary" /> Average Pace
            </span>
            <span className="mt-1 font-mono text-base font-bold text-foreground">
              {stats.avgWpm}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">WPM</span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Zap className="size-3 text-accent" /> Peak Burst
            </span>
            <span className="mt-1 font-mono text-base font-bold text-accent">
              {stats.peakWpm}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                at {stats.peakSec}s
              </span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="size-3 text-primary" /> Target
            </span>
            <span className="mt-1 font-mono text-base font-bold text-foreground">
              {targetWpm ? (
                <>
                  {stats.avgWpm >= targetWpm ? (
                    <span className="text-emerald-500">+{stats.avgWpm - targetWpm}</span>
                  ) : (
                    <span className="text-amber-500">-{targetWpm - stats.avgWpm}</span>
                  )}{" "}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    vs {targetWpm}
                  </span>
                </>
              ) : (
                <span className="text-xs font-normal text-muted-foreground">None</span>
              )}
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Award className="size-3 text-muted-foreground" /> Lowest Dip
            </span>
            <span className="mt-1 font-mono text-base font-bold text-muted-foreground">
              {stats.minWpm}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                at {stats.minSec}s
              </span>
            </span>
          </div>

          {isExpanded ? (
            <>
              <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Clock className="size-3 text-primary" /> Total Time
                </span>
                <span className="mt-1 font-mono text-base font-bold text-foreground">
                  {data.length}s
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Flame className="size-3 text-primary" /> Ghost Avg (Best)
                </span>
                <span className="mt-1 font-mono text-base font-bold text-foreground">
                  {stats.ghostAvg !== undefined ? `${stats.ghostAvg} WPM` : "None"}
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}
      footer={(isExpanded) => (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-3.5 rounded-full bg-primary" /> Current Run
            </span>
            {hasGhost && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-muted-foreground" />{" "}
                Personal Best
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
            <span className="font-mono text-xs text-muted-foreground">{data.length}s duration</span>
            <span className="hidden text-[10px] text-primary sm:inline-block">
              {isExpanded ? "(Click to collapse)" : "(Click to expand)"}
            </span>
          </div>
        </div>
      )}
    >
      {(isExpanded) => (
        <SvgLineChart
          data={data}
          xKey="second"
          xLabel="Time (seconds)"
          series={series}
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
