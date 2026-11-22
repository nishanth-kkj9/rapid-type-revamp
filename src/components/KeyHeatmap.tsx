import { useEffect, useMemo, useState } from "react";
import { aggregateKeyMistakes, averageMsByKey, heatLevel } from "@/lib/heatmap";
import {
  getKeyboardRows,
  type KeyboardLayoutId,
  type KeyboardStandard,
} from "@/lib/keyboardLayout";
import type { KeySpeedMap } from "@/lib/keySpeed";
import { appStorage } from "@/lib/storage";
import { DEFAULT_UI_PREFS, loadUiPrefsFromStorage, saveUiPrefsToStorage } from "@/lib/uiPrefs";

interface Props {
  mistakes: Record<string, number>;
  /** Lifetime per-key speed data ([totalMs, samples] per raw char). Drill mode. */
  speed?: KeySpeedMap | null;
  layout?: KeyboardLayoutId | undefined;
  standard?: KeyboardStandard | undefined;
  className?: string;
}

/** Static class map so Tailwind can see every literal. */
const LEVEL_CLASS: Record<number, string> = {
  1: "bg-destructive/20",
  2: "bg-destructive/35",
  3: "bg-destructive/65 text-destructive-foreground",
  4: "bg-destructive/85 text-destructive-foreground",
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
      className={`inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border px-3 py-1 text-[13px] transition-colors ${
        active
          ? "border-primary/60 bg-primary/15 font-semibold text-foreground ring-1 ring-primary/40"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Lifetime heatmap over the physical layout, accessible without pointer hover. */
export function KeyHeatmap({
  mistakes,
  speed = null,
  layout = "qwerty",
  standard = "ansi",
  className = "",
}: Props) {
  const [metric, setMetric] = useState<Metric>(DEFAULT_UI_PREFS.heatmapMetric);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadUiPrefsFromStorage(appStorage).then((prefs) => {
      if (!cancelled) setMetric(prefs.heatmapMetric);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasSpeed = !!speed && Object.keys(speed).length > 0;
  const active: Metric = hasSpeed ? metric : "misses";

  const handleSelectMetric = (nextMetric: Metric) => {
    setMetric(nextMetric);
    void saveUiPrefsToStorage(appStorage, { heatmapMetric: nextMetric });
  };

  const rows = getKeyboardRows(layout, standard);
  const missCounts = useMemo(
    () => aggregateKeyMistakes(mistakes, layout, standard),
    [mistakes, layout, standard],
  );
  const missMax = Math.max(0, ...Object.values(missCounts));
  const avgMs = useMemo(
    () => (hasSpeed && speed ? averageMsByKey(speed, layout, standard) : {}),
    [hasSpeed, speed, layout, standard],
  );
  const avgValues = Object.values(avgMs);
  const avgMax = avgValues.length > 0 ? Math.max(...avgValues) : 0;

  const topEntries = useMemo(() => {
    if (active === "speed") {
      return Object.entries(avgMs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k, v]) => ({ key: k, value: `${Math.round(v)}ms` }));
    }
    return Object.entries(missCounts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, n]) => ({ key: k, value: `${n} ${n === 1 ? "miss" : "misses"}` }));
  }, [active, avgMs, missCounts]);

  const selectedMisses = selectedKey ? (missCounts[selectedKey] ?? 0) : 0;
  const selectedMs = selectedKey ? avgMs[selectedKey] : undefined;

  return (
    <div className={className} aria-label="Per-key performance heatmap">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {hasSpeed ? (
          <div className="flex gap-1.5" role="group" aria-label="Heatmap metric">
            <MetricChip active={active === "misses"} onClick={() => handleSelectMetric("misses")}>
              Misses
            </MetricChip>
            <MetricChip active={active === "speed"} onClick={() => handleSelectMetric("speed")}>
              Speed
            </MetricChip>
          </div>
        ) : (
          <span className="text-[13px] text-muted-foreground">Key mistakes heatmap</span>
        )}
        <span className="text-[13px] text-muted-foreground">
          Tap or focus a key for exact metrics
        </span>
      </div>

      <div className="panel select-none space-y-1 p-2 sm:space-y-1.5 sm:p-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-1.5">
            {row.map((cell) => {
              const statKey = cell.id === "Space" ? "Space" : cell.isModifier ? "" : cell.base;
              const n = statKey ? (missCounts[statKey] ?? 0) : 0;
              const ms = statKey ? avgMs[statKey] : undefined;
              const level = active === "speed" ? heatLevel(ms ?? 0, avgMax) : heatLevel(n, missMax);
              const cls = LEVEL_CLASS[level] ?? "";
              const rawLabel =
                cell.id === "Space" ? "Space" : cell.id === "EnterTop" ? "⏎" : cell.base;
              const label = rawLabel.length === 1 ? rawLabel.toUpperCase() : rawLabel;
              const isSelected = Boolean(statKey && selectedKey === statKey);
              const valueLabel =
                active === "speed"
                  ? ms != null
                    ? `${Math.round(ms)}ms average`
                    : "no speed samples yet"
                  : `${n} all-time ${n === 1 ? "miss" : "misses"}`;

              if (!statKey) {
                return (
                  <div
                    key={`${rowIndex}-${cell.id}`}
                    aria-hidden="true"
                    className={`keycap flex h-9 min-w-0 items-center justify-center px-0.5 font-mono text-[13px] opacity-75 sm:h-11 sm:px-1 ${
                      cell.width ?? "flex-1"
                    }`}
                  >
                    <span className="truncate">{cell.base}</span>
                  </div>
                );
              }

              return (
                <button
                  key={`${rowIndex}-${cell.id}`}
                  type="button"
                  onClick={() => setSelectedKey((curr) => (curr === statKey ? null : statKey))}
                  aria-pressed={isSelected}
                  aria-label={`Key ${statKey}: ${valueLabel}`}
                  className={`keycap flex h-9 min-w-0 cursor-pointer items-center justify-center gap-0.5 px-0.5 font-mono text-[13px] sm:h-11 sm:px-1 ${
                    cell.width ?? "flex-1"
                  } ${cls} ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                >
                  <span className="truncate">{cell.id === "Space" ? "␣" : label}</span>
                  {active === "misses" && n > 0 ? (
                    <span className="hidden shrink-0 text-[13px] font-bold sm:inline">{n}</span>
                  ) : null}
                  {active === "speed" && ms != null ? (
                    <span className="hidden shrink-0 text-[13px] font-bold sm:inline">
                      {Math.round(ms)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div
        aria-live="polite"
        className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-[13px] text-foreground"
      >
        {selectedKey ? (
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Selected key:{" "}
              <strong className="font-mono text-primary">
                {selectedKey.length === 1 ? selectedKey.toUpperCase() : selectedKey}
              </strong>
            </span>
            <span>
              Misses: <strong className="font-mono tabular-nums">{selectedMisses}</strong>
            </span>
            {selectedMs !== undefined ? (
              <span>
                Avg speed:{" "}
                <strong className="font-mono tabular-nums">{Math.round(selectedMs)} ms</strong>
              </span>
            ) : null}
          </div>
        ) : topEntries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-muted-foreground">
              {active === "speed" ? "Slowest keys:" : "Top missed keys:"}
            </span>
            {topEntries.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedKey(item.key)}
                className="cursor-pointer rounded border border-border bg-card px-2 py-0.5 text-[13px] text-foreground hover:border-primary"
              >
                <span className="font-mono text-primary">
                  {item.key.length === 1 ? item.key.toUpperCase() : item.key}
                </span>{" "}
                · <span className="font-mono tabular-nums">{item.value}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">No mistakes recorded yet.</span>
        )}
      </div>
    </div>
  );
}
