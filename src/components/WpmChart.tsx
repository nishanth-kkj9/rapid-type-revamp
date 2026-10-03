import { useState, useMemo, useEffect } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Zap, Target, Award, Maximize2, Minimize2, X, Clock, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** Cumulative correct-character counts sampled once per second. */
  samples: number[];
  ghost?: number[] | undefined;
  targetWpm?: number | undefined;
  className?: string | undefined;
  defaultOpen?: boolean | undefined;
}

/**
 * Timed Drill Progress component using Framer Motion's layout prop.
 * Features an onClick handler that toggles `isExpanded` state and updates CSS classes
 * to animate the chart from its current size to expanded/full dimensions with a smooth spring transition.
 */
export function WpmChart({
  samples,
  ghost,
  targetWpm,
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

  const hasGhost = Boolean(ghost && ghost.length >= 2);
  const len = hasGhost ? Math.min(samples.length, ghost!.length) : samples.length;

  const data = useMemo(() => {
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

  if (samples.length < 2) return null;

  return (
    <>
      {/* Backdrop when expanded full-screen */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="wpm-backdrop"
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
            ? "fixed inset-3 sm:inset-6 md:inset-10 lg:inset-16 z-50 flex flex-col justify-between overflow-y-auto rounded-2xl border border-primary/50 bg-card/98 p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-primary/20"
            : `panel p-3 text-sm transition-colors hover:border-primary/40 cursor-pointer ${className}`
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
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  Timed Drill Progress
                </span>
                <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {stats.avgWpm} WPM Avg
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {isExpanded
                  ? "Full Analytics & Real-Time Velocity Graph"
                  : "Click anywhere on chart to expand full dimensions"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
              <span className="text-muted-foreground">Peak:</span>
              <span className="font-bold text-accent">{stats.peakWpm} WPM</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              aria-label={isExpanded ? "Collapse progress chart" : "Expand progress chart"}
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
                  <Flame className="size-3 text-primary" /> Personal Best
                </span>
                <span className="mt-1 font-mono text-base font-bold text-foreground">
                  {stats.ghostAvg !== undefined ? `${stats.ghostAvg} WPM` : "None"}
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
                  value: "Time (seconds)",
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
                  `${v} WPM`,
                  name === "ghostWpm" ? "Personal Best" : "Current Run",
                ]}
                labelFormatter={(l) => `Time: ${l}s`}
              />
              <Line
                type="monotone"
                dataKey="wpm"
                stroke="var(--color-primary)"
                strokeWidth={isExpanded ? 3 : 2}
                dot={{ r: isExpanded ? 3.5 : 2, fill: "var(--color-primary)" }}
                activeDot={{
                  r: isExpanded ? 7 : 5,
                  stroke: "var(--color-background)",
                  strokeWidth: 2,
                }}
                isAnimationActive={false}
              />
              {hasGhost && (
                <Line
                  type="monotone"
                  dataKey="ghostWpm"
                  stroke="var(--color-muted-foreground)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
              {typeof targetWpm === "number" && targetWpm > 0 ? (
                <ReferenceLine
                  y={targetWpm}
                  stroke="var(--color-primary)"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
                  label={{
                    value: `Target ${targetWpm} WPM`,
                    position: "insideTopRight",
                    fontSize: isExpanded ? 11 : 10,
                    fill: "var(--color-muted-foreground)",
                  }}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend & Footer Info */}
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
            {!isExpanded ? (
              <span className="hidden sm:inline-block text-[10px] text-primary">
                (Click to expand)
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>
    </>
  );
}
