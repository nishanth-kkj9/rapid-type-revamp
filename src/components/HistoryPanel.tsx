import { useMemo, useRef, useState } from "react";
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
  exportHistory,
  importHistory,
  type HistoryEntry,
} from "@/lib/typingStats";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
  onImport?: (entries: HistoryEntry[]) => void;
}

export function HistoryPanel({ history, onClear, onImport }: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const best = history.reduce((m, h) => Math.max(m, h.wpm), 0);
  const avg = history.length
    ? history.reduce((a, h) => a + h.wpm, 0) / history.length
    : 0;

  const chartData = useMemo(
    () =>
      history
        .slice(0, 20)
        .reverse()
        .map((h, i) => ({
          run: i + 1,
          wpm: Math.round(h.wpm),
          accuracy: Math.round(h.accuracy),
        })),
    [history],
  );

  const improvement = useMemo(() => {
    if (history.length < 20) return 0;
    const first10 = history.slice(-10).reduce((a, h) => a + h.wpm, 0) / 10;
    const last10 = history.slice(0, 10).reduce((a, h) => a + h.wpm, 0) / 10;
    return first10 > 0 ? ((last10 - first10) / first10) * 100 : 0;
  }, [history]);

  const handleExport = () => {
    const blob = new Blob([exportHistory()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typing-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importHistory(String(event.target?.result ?? ""));
      if (result === null) setImportError("Invalid history file.");
      else {
        setImportError(null);
        onImport?.(result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Progress
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={history.length === 0}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          {history.length > 0 ? (
            <button
              onClick={onClear}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {importError ? (
        <p className="mt-3 text-xs text-destructive">{importError}</p>
      ) : null}

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Finish a run to start tracking your speed over time.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Best
              </div>
              <div className="font-mono text-2xl font-semibold text-primary tabular-nums">
                {best.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Average
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                {avg.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Runs
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                {history.length}
              </div>
            </div>
            {history.length >= 20 ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Improvement
                </div>
                <div
                  className={`font-mono text-2xl font-semibold tabular-nums ${
                    improvement >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {improvement > 0 ? "+" : ""}
                  {improvement.toFixed(0)}%
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="run"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="wpm"
                  name="WPM"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy %"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-5 divide-y divide-border/70 text-sm">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">
                  {new Date(h.date).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                    {h.difficulty}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  <span className="text-primary">{h.wpm.toFixed(0)}</span> wpm ·{" "}
                  {h.accuracy.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
