import { useState, useMemo, useEffect } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Crosshair,
  Zap,
  Award,
  Maximize2,
  Minimize2,
  X,
  Clock,
  Shield,
  Target,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShooterRunSummary } from "@/lib/typingStats";

interface Props {
  summary: ShooterRunSummary | null;
  samples?: number[] | undefined;
  highScore?: number | undefined;
  className?: string | undefined;
  defaultOpen?: boolean | undefined;
}

/**
 * Word Shooter Progress component using Framer Motion's layout prop.
 * Features an onClick handler that toggles `isExpanded` state and updates CSS classes
 * to animate the arcade velocity chart from current size to expanded/full dimensions with a smooth spring transition.
 */
export function WordShooterProgress({
  summary,
  samples,
  highScore,
  className = "",
  defaultOpen = false,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);

  // Close on Escape key when expanded
  useEffect(() => {
    if (!isExpanded) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  // Construct second-by-second velocity / destruction data
  const data = useMemo(() => {
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

    // Fallback if raw per-second samples were unavailable: synthesize second points from summary
    const duration = Math.max(2, summary.durationSec || 15);
    const totalWords = summary.wordsDestroyed || 1;
    const avgWordsPerSec = totalWords / duration;

    return Array.from({ length: duration }, (_, i) => {
      const sec = i + 1;
      const progress = sec / duration;
      // Slight sinusoidal natural curve to mimic wave pacing
      const velocityWave = Math.sin((sec / duration) * Math.PI) * 0.4 + 0.8;
      const rateWpm = Math.max(10, Math.round(avgWordsPerSec * velocityWave * 60));
      const cumulativeWords = Math.min(totalWords, Math.round(avgWordsPerSec * sec));
      const score = Math.round(progress * summary.score);

      return {
        second: sec,
        rateWpm,
        cumulativeWords,
        score,
      };
    });
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

  if (!summary && data.length === 0) return null;

  return (
    <>
      {/* Backdrop when expanded full-screen */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="shooter-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Animated Chart Container */}
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 28,
        }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button") || target.closest("a")) return;
          setIsExpanded((prev) => !prev);
        }}
        className={
          isExpanded
            ? "fixed inset-3 sm:inset-6 md:inset-10 lg:inset-16 z-50 flex flex-col justify-between overflow-y-auto rounded-2xl border border-accent/50 bg-card/98 p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-accent/20"
            : `panel p-3 text-sm transition-colors hover:border-accent/40 cursor-pointer ${className}`
        }
      >
        {/* Header / Interactive Toggle Bar */}
        <div className="flex select-none items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="flex flex-1 cursor-pointer items-center gap-2.5 truncate"
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Crosshair className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  Word Shooter Progress
                </span>
                <span className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent">
                  {summary?.score ?? 0} pts
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isExpanded
                  ? "Full Combat Analytics & Wave Destruction Velocity"
                  : "Click anywhere on chart to expand full dimensions"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
              <span className="text-muted-foreground">Destroyed:</span>
              <span className="font-bold text-primary">{summary?.wordsDestroyed ?? 0} words</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              aria-label={isExpanded ? "Collapse shooter chart" : "Expand shooter chart"}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95"
            >
              {isExpanded ? (
                <Minimize2 className="size-4 text-primary" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>

            {isExpanded ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                aria-label="Close expanded view"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-all hover:bg-destructive/20 hover:text-destructive active:scale-95"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Stats Badges Grid */}
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

        {/* Dynamic Responsive Chart Area */}
        <div
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
          }}
          className={`mt-3 rounded-xl border border-border/80 bg-background/60 p-2 sm:p-4 transition-all ${
            isExpanded
              ? "h-[340px] sm:h-[440px] md:h-[500px]"
              : "h-44 sm:h-52 cursor-pointer hover:border-primary/50"
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 6, left: -4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
              <XAxis
                dataKey="second"
                tick={{ fontSize: isExpanded ? 12 : 10 }}
                stroke="var(--color-muted-foreground)"
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                label={{
                  value: "Combat Time (seconds)",
                  position: "insideBottomRight",
                  offset: -4,
                  fontSize: isExpanded ? 12 : 10,
                  fill: "var(--color-muted-foreground)",
                }}
              />
              <YAxis
                width={isExpanded ? 40 : 34}
                tick={{ fontSize: isExpanded ? 12 : 10 }}
                stroke="var(--color-muted-foreground)"
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  fontSize: 12,
                  padding: "8px 12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                }}
                formatter={(v: number, name: string) => [
                  name === "rateWpm" ? `${v} WPM` : `${v} words`,
                  name === "rateWpm" ? "Fire Velocity" : "Words Destroyed",
                ]}
                labelFormatter={(l) => `Combat Time: ${l}s`}
              />
              <Line
                type="monotone"
                dataKey="rateWpm"
                stroke="var(--color-accent)"
                strokeWidth={isExpanded ? 3 : 2}
                dot={{ r: isExpanded ? 3.5 : 2, fill: "var(--color-accent)" }}
                activeDot={{
                  r: isExpanded ? 7 : 5,
                  stroke: "var(--color-background)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Footer Info */}
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
            {!isExpanded ? (
              <span className="hidden sm:inline-block text-[10px] text-accent">
                (Click to expand)
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>
    </>
  );
}
