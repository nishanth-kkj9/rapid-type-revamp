import { useMemo } from "react";
import { Crosshair, Zap, Award, Clock, Shield, Target, Trophy } from "lucide-react";
import type { ShooterRunSummary } from "@/lib/typingStats";
import { ExpandableChartCard } from "@/components/charts/ExpandableChartCard";
import { SvgLineChart, type LineSeriesConfig } from "@/components/charts/LineChart";

interface Props {
  summary: ShooterRunSummary | null;
  samples?: number[] | undefined;
  highScore?: number | undefined;
  className?: string | undefined;
  defaultOpen?: boolean | undefined;
}

interface ShooterPoint extends Record<string, unknown> {
  second: number;
  rateWpm: number;
  cumulativeWords: number;
  score: number;
}

export function WordShooterProgress({
  summary,
  samples,
  highScore,
  className = "",
  defaultOpen = false,
}: Props) {
  const data: ShooterPoint[] = useMemo(() => {
    if (!summary) return [];

    const effectiveSamples =
      samples && samples.length >= 2
        ? samples
        : summary.samples && summary.samples.length >= 2
          ? summary.samples
          : null;

    if (effectiveSamples) {
      return effectiveSamples.map((curVal, i) => {
        const curPrev = i === 0 ? 0 : (effectiveSamples[i - 1] ?? 0);
        const deltaChars = Math.max(0, curVal - curPrev);
        const rateWpm = Math.round((deltaChars / 5) * 60);
        const cumulativeWords = Math.round(curVal / 5);
        const estimatedScore = Math.round(
          (curVal / (effectiveSamples[effectiveSamples.length - 1] || 1)) * summary.score,
        );

        return {
          second: i + 1,
          rateWpm,
          cumulativeWords,
          score: estimatedScore,
        };
      });
    }

    return [];
  }, [summary, samples]);

  const stats = useMemo(() => {
    if (!summary || data.length === 0) {
      return { peakWpm: 0, peakSec: 1, avgWpm: 0 };
    }
    const wpms = data.map((d) => d.rateWpm);
    const peakWpm = Math.max(...wpms);
    const peakSec = data.find((d) => d.rateWpm === peakWpm)?.second ?? 1;
    const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / (wpms.length || 1));

    return { peakWpm, peakSec, avgWpm };
  }, [summary, data]);

  const series: LineSeriesConfig<ShooterPoint>[] = useMemo(
    () => [
      {
        key: "rateWpm",
        label: "Fire Velocity",
        color: "var(--color-accent)",
        showDots: true,
        fillArea: true,
        formatValue: (v, row) => `${v} WPM (${row.cumulativeWords}w)`,
      },
    ],
    [],
  );

  if (!summary && data.length === 0) return null;

  return (
    <ExpandableChartCard
      title="Word Shooter Progress"
      expandedSubtitle="Full Combat Analytics & Wave Destruction Velocity"
      badge={`${summary?.score ?? 0} pts`}
      accent="accent"
      className={className}
      defaultOpen={defaultOpen}
      isEmpty={data.length === 0}
      expandAriaLabel="Expand shooter chart"
      collapseAriaLabel="Collapse shooter chart"
      icon={
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Crosshair className="size-4" />
        </div>
      }
      headerRight={
        <div className="hidden items-center gap-1.5 font-mono text-xs sm:flex">
          <span className="text-muted-foreground">Destroyed:</span>
          <span className="font-bold text-primary">{summary?.wordsDestroyed ?? 0} words</span>
        </div>
      }
      emptyState={
        <p className="text-center text-xs text-muted-foreground">
          Per-second firing velocity telemetry unavailable for this run.
        </p>
      }
      statsGrid={(isExpanded) => (
        <div
          className={`grid gap-2 pt-3 ${
            isExpanded ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Trophy className="size-3 text-accent" /> Score
            </span>
            <span className="mt-1 font-mono text-base font-bold text-accent">
              {summary?.score ?? 0}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">pts</span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="size-3 text-primary" /> Destroyed
            </span>
            <span className="mt-1 font-mono text-base font-bold text-primary">
              {summary?.wordsDestroyed ?? 0}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">words</span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Zap className="size-3 text-primary" /> Peak Fire Rate
            </span>
            <span className="mt-1 font-mono text-base font-bold text-foreground">
              {stats.peakWpm}{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                WPM at {stats.peakSec}s
              </span>
            </span>
          </div>

          <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Award className="size-3 text-primary" /> Accuracy
            </span>
            <span className="mt-1 font-mono text-base font-bold text-foreground">
              {summary?.accuracy ? summary.accuracy.toFixed(0) : "100"}%
            </span>
          </div>

          {isExpanded ? (
            <>
              <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Shield className="size-3 text-primary" /> Wave Level
                </span>
                <span className="mt-1 font-mono text-base font-bold text-foreground">
                  Level {summary?.level ?? 1}
                </span>
              </div>

              <div className="flex flex-col rounded-xl border border-border/70 bg-secondary/30 p-2.5 text-left">
                <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Clock className="size-3 text-primary" /> Survival Time
                </span>
                <span className="mt-1 font-mono text-base font-bold text-foreground">
                  {summary?.durationSec ?? data.length}s
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
              <span className="inline-block h-1 w-3.5 rounded-full bg-accent" /> Word Elimination
              Velocity (WPM)
            </span>
            {highScore && highScore > 0 ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="size-3 text-accent" /> High Score: {highScore} pts
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {summary?.difficulty ? `${summary.difficulty.toUpperCase()} MODE` : "ARCADE"} ·{" "}
              {data.length}s
            </span>
            {data.length > 0 ? (
              <span className="hidden text-[10px] text-accent sm:inline-block">
                {isExpanded ? "(Click to collapse)" : "(Click to expand)"}
              </span>
            ) : null}
          </div>
        </div>
      )}
    >
      {(isExpanded) => (
        <SvgLineChart
          data={data}
          xKey="second"
          xLabel="Combat Time (seconds)"
          series={series}
          expanded={isExpanded}
          formatXTick={(v) => `${v}s`}
          formatTooltipTitle={(row) => `Combat Time: ${row.second}s`}
        />
      )}
    </ExpandableChartCard>
  );
}
