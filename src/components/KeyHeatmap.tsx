import { useEffect, useState } from "react";
import { aggregateKeyMistakes, averageMsByKey, heatLevel } from "@/lib/heatmap";
import { KEYBOARD_ROWS, KEY_WIDTHS } from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import { DEFAULT_UI_PREFS, loadUiPrefs, saveUiPrefs } from "@/lib/uiPrefs";

interface Props {
  mistakes: Record<string, number>;
  /** Lifetime per-key speed data ([totalMs, samples] per raw char). Drill mode. */
  speed?: KeySpeedMap | null;
  className?: string;
}

/** Static class map so Tailwind can see every literal. */
const LEVEL_CLASS: Record<number, string> = {
  1: "bg-destructive/15",
  2: "bg-destructive/30",
  3: "bg-destructive/55 text-white",
  4: "bg-destructive/80 text-white",
};

type Metric = "misses" | "speed";

function MetricChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-7 items-center justify-center rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors sm:min-h-6 sm:px-2.5 sm:py-0.5 sm:text-xs ${
        active
          ? "border-primary/60 bg-primary/10 font-semibold text-foreground ring-1 ring-primary/30"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Lifetime heatmap over the physical layout with an optional Misses/Speed
 *  toggle. Keys stay decorative (aria-hidden); the accessible representation
 *  remains the ProblemKeys chip strip rendered above this panel. */
export function KeyHeatmap({ mistakes, speed = null, className = "" }: Props) {
  const [metric, setMetric] = useState<Metric>(DEFAULT_UI_PREFS.heatmapMetric);

  useEffect(() => {
    setMetric(loadUiPrefs().heatmapMetric);
  }, []);

  const hasSpeed = !!speed && Object.keys(speed).length > 0;
  const active: Metric = hasSpeed ? metric : "misses";

  const handleSelectMetric = (nextMetric: Metric) => {
    setMetric(nextMetric);
    saveUiPrefs({ heatmapMetric: nextMetric });
  };

  const missCounts = aggregateKeyMistakes(mistakes);
  const missMax = Math.max(0, ...Object.values(missCounts));
  const avgMs = hasSpeed ? averageMsByKey(speed) : {};
  const avgValues = Object.values(avgMs);
  const avgMax = avgValues.length > 0 ? Math.max(...avgValues) : 0;

  return (
    <div className={className}>
      {hasSpeed ? (
        <div className="mb-1.5 flex gap-1.5" role="group" aria-label="Heatmap metric">
          <MetricChip active={active === "misses"} onClick={() => handleSelectMetric("misses")}>
            Misses
          </MetricChip>
          <MetricChip active={active === "speed"} onClick={() => handleSelectMetric("speed")}>
            Speed
          </MetricChip>
        </div>
      ) : null}
      <div className="panel select-none space-y-1 p-2 sm:space-y-1.5 sm:p-4" aria-hidden="true">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
            {row.map((k) => {
              const n = missCounts[k] ?? 0;
              const ms = avgMs[k];
              const level = active === "speed" ? heatLevel(ms ?? 0, avgMax) : heatLevel(n, missMax);
              const cls = LEVEL_CLASS[level] ?? "";
              const title =
                active === "speed"
                  ? ms != null
                    ? `${k}: ${Math.round(ms)}ms average`
                    : undefined
                  : n > 0
                    ? `${k}: ${n} all-time misses`
                    : undefined;
              return (
                <div
                  key={`${rowIndex}-${k}`}
                  title={title}
                  className={`keycap flex h-8 min-w-0 items-center justify-center px-0.5 font-mono text-[10px] uppercase sm:h-11 sm:px-1 sm:text-xs ${
                    KEY_WIDTHS[k] ?? "flex-1"
                  } ${cls}`}
                >
                  <span className="truncate">{k === "Space" ? "" : k}</span>
                  {active === "misses" && n > 0 ? (
                    <span className="ml-0.5 shrink-0 text-[8px] font-bold sm:text-[9px]">{n}</span>
                  ) : null}
                  {active === "speed" && ms != null ? (
                    <span className="ml-0.5 shrink-0 text-[8px] font-bold sm:text-[9px]">
                      {Math.round(ms)}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
