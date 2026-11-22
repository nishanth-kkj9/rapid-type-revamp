import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Trophy } from "lucide-react";
import {
  computePersonalBestsTable,
  computeSameTypeTrend,
  formatModeLabel,
  normalizeModeKey,
  type HistoryEntry,
} from "@/lib/typingStats";
import {
  DATE_RANGES,
  HistoryDrillFilters,
  type DateRangeFilter,
  type DifficultyFilter,
  type TestTypeFilter,
} from "@/components/HistoryDrillFilters";
import { HistoryPersonalBestsTable } from "@/components/HistoryPersonalBestsTable";

interface HistoryDrillViewProps {
  drillAll: HistoryEntry[];
  onSelectRun: (entry: HistoryEntry) => void;
  onDeleteRun: (entry: HistoryEntry) => void;
  onStartRun?: (() => void) | undefined;
}

const PAGE_SIZE = 12;

export function HistoryDrillView({
  drillAll,
  onSelectRun,
  onDeleteRun,
  onStartRun,
}: HistoryDrillViewProps) {
  const [testType, setTestType] = useState<TestTypeFilter>("all");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const rangeDef = DATE_RANGES.find((r) => r.id === dateRange);
    const cutoffMs =
      rangeDef && rangeDef.days !== null ? Date.now() - rangeDef.days * 86_400_000 : null;

    return drillAll.filter((h) => {
      if (testType !== "all" && normalizeModeKey(h.mode || "30s") !== testType) return false;
      if (difficulty !== "all" && h.difficulty.toLowerCase() !== difficulty) return false;
      if (cutoffMs !== null && h.date < cutoffMs) return false;
      return true;
    });
  }, [drillAll, testType, difficulty, dateRange]);

  const bestWpm = useMemo(() => filtered.reduce((m, h) => Math.max(m, h.wpm), 0), [filtered]);
  const avgWpm = useMemo(
    () => (filtered.length ? filtered.reduce((a, h) => a + h.wpm, 0) / filtered.length : 0),
    [filtered],
  );
  const avgAccuracy = useMemo(
    () => (filtered.length ? filtered.reduce((a, h) => a + h.accuracy, 0) / filtered.length : 0),
    [filtered],
  );
  const trend = useMemo(
    () => computeSameTypeTrend(filtered, testType, difficulty),
    [filtered, testType, difficulty],
  );
  const pbTable = useMemo(() => computePersonalBestsTable(drillAll), [drillAll]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="mt-4 space-y-5">
      <HistoryDrillFilters
        testType={testType}
        difficulty={difficulty}
        dateRange={dateRange}
        onTestTypeChange={(val) => {
          setTestType(val);
          setPage(1);
        }}
        onDifficultyChange={(val) => {
          setDifficulty(val);
          setPage(1);
        }}
        onDateRangeChange={(val) => {
          setDateRange(val);
          setPage(1);
        }}
      />

      {drillAll.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Trophy className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No runs yet. Your first result starts the log.
          </p>
          {onStartRun ? (
            <button
              type="button"
              onClick={onStartRun}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start your first run
            </button>
          ) : null}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No runs recorded matching the selected filter criteria.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Best WPM
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                {bestWpm.toFixed(0)}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Average WPM
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums">{avgWpm.toFixed(0)}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Accuracy
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {avgAccuracy.toFixed(0)}%
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Runs
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums">{filtered.length}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Trend (same type)
              </div>
              {trend ? (
                <div
                  className={`font-mono text-2xl font-bold tabular-nums ${trend.deltaPercent >= 0 ? "text-primary" : "text-destructive"}`}
                >
                  {trend.deltaPercent > 0 ? "+" : ""}
                  {trend.deltaPercent.toFixed(1)}%
                </div>
              ) : (
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {testType === "all" ? "Select a test type" : "Need 6+ matching runs"}
                </div>
              )}
            </div>
          </div>

          <HistoryPersonalBestsTable rows={pbTable} />

          <div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider">
                Run Log ({startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length})
              </span>
              <span>Click any run to inspect details</span>
            </div>
            <ul className="divide-y divide-border/70 rounded-xl border border-border/70 bg-card/60 text-sm">
              {pageItems.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-secondary/30"
                >
                  <button
                    type="button"
                    onClick={() => onSelectRun(h)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">
                      {new Date(h.date).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · <span className="capitalize text-foreground">{h.difficulty}</span> ·{" "}
                      <span className="font-semibold text-primary">{formatModeLabel(h.mode)}</span>
                      {h.strict ? ` · strict: ${h.strict}` : ""}
                      {h.repeated ? " · repeat" : ""}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums sm:text-sm">
                      <strong className="font-semibold text-primary">{h.wpm.toFixed(0)}</strong> wpm
                      · <span className="text-foreground">{h.accuracy.toFixed(0)}% acc</span> ·{" "}
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {h.consistency.toFixed(0)}% sync
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRun(h)}
                    aria-label="Delete run"
                    title="Delete run"
                    className="cursor-pointer rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </button>
                <span className="font-mono">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
