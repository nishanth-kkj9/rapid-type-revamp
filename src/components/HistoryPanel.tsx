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
import { exportHistory, importHistoryResult, type HistoryEntry } from "@/lib/typingStats";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";

interface Props {
  history: HistoryEntry[];
  onClear: () => void;
  onImport?: (entries: HistoryEntry[]) => void;
}

const DURATION_FILTERS = ["all", "15s", "30s", "60s", "120s"] as const;
type DurationFilter = (typeof DURATION_FILTERS)[number];

export function HistoryPanel({ history, onClear, onImport }: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredHistory = useMemo(() => {
    if (durationFilter === "all") return history;
    return history.filter((h) => {
      if (!h.mode) return durationFilter === "30s"; // legacy fallback
      const m = h.mode.toLowerCase();
      return m === durationFilter || m === durationFilter.replace("s", "");
    });
  }, [history, durationFilter]);

  const best = filteredHistory.reduce((m, h) => Math.max(m, h.wpm), 0);
  const avg = filteredHistory.length
    ? filteredHistory.reduce((a, h) => a + h.wpm, 0) / filteredHistory.length
    : 0;

  const chartData = useMemo(
    () =>
      filteredHistory
        .slice(0, 20)
        .reverse()
        .map((h, i) => ({
          run: i + 1,
          wpm: Math.round(h.wpm),
          accuracy: Math.round(h.accuracy),
        })),
    [filteredHistory],
  );

  const improvement = useMemo(() => {
    if (filteredHistory.length < 20) return 0;
    const first10 = filteredHistory.slice(-10).reduce((a, h) => a + h.wpm, 0) / 10;
    const last10 = filteredHistory.slice(0, 10).reduce((a, h) => a + h.wpm, 0) / 10;
    return first10 > 0 ? ((last10 - first10) / first10) * 100 : 0;
  }, [filteredHistory]);

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
      const res = importHistoryResult(String(event.target?.result ?? ""));
      if (!res.ok) {
        if (res.reason === "quota") {
          setImportError("Browser storage is full. Please clear space or export existing runs.");
        } else {
          setImportError("Invalid or corrupted history JSON file.");
        }
      } else {
        setImportError(null);
        toast.success(`Imported ${res.list.length} history records.`);
        onImport?.(res.list);
      }
    };
    reader.readAsText(file);
  };

  const handleClearWithUndo = () => {
    const previous = [...history];
    onClear();
    setConfirmClear(false);
    toast("History cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          onImport?.(previous);
          toast.success("History restored.");
        },
      },
      duration: 6000,
    });
  };

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Progress
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={history.length === 0}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            data-lpignore="true"
            data-protonpass-ignore="true"
            data-1p-ignore="true"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />

          {history.length > 0 ? (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearWithUndo}
                  className="flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
                >
                  <Trash2 className="size-3.5" />
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive cursor-pointer"
              >
                Clear
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* Duration Filter Chips */}
      {history.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-border/50 pb-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">
            Duration:
          </span>
          {DURATION_FILTERS.map((d) => {
            const active = durationFilter === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDurationFilter(d)}
                className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "all" ? "All Durations" : d}
              </button>
            );
          })}
        </div>
      ) : null}

      {importError ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/15 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{importError}</span>
        </div>
      ) : null}

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Finish a run to start tracking your speed over time.
        </p>
      ) : filteredHistory.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No runs recorded for the{" "}
          <span className="font-semibold text-foreground">{durationFilter}</span> duration yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Best {durationFilter !== "all" ? `(${durationFilter})` : ""}
              </div>
              <div className="font-mono text-2xl font-semibold text-primary tabular-nums">
                {best.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Average
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">{avg.toFixed(0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Runs
              </div>
              <div className="font-mono text-2xl font-semibold tabular-nums">
                {filteredHistory.length}
              </div>
            </div>
            {filteredHistory.length >= 20 ? (
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
                  stroke="var(--color-primary, var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  name="Accuracy %"
                  stroke="var(--color-accent, var(--accent))"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-5 divide-y divide-border/70 text-sm">
            {filteredHistory.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-muted-foreground flex items-center gap-1.5">
                  <span>
                    {new Date(h.date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider text-foreground">
                    {h.difficulty}
                  </span>
                  {h.mode ? (
                    <span className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] font-mono text-primary font-semibold">
                      {h.mode.endsWith("s") ? h.mode : `${h.mode}s`}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono tabular-nums">
                  <span className="text-primary font-semibold">{h.wpm.toFixed(0)}</span> wpm ·{" "}
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
