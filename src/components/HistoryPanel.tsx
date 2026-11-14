import { useId, useMemo, useRef, useState } from "react";
import { importHistoryResult, type HistoryEntry } from "@/lib/typingStats";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Timer,
  Crosshair,
  Download,
  Upload,
  Trophy,
  Target,
  Zap,
  ClipboardPaste,
} from "lucide-react";
import { ExpandableChartCard } from "@/components/charts/ExpandableChartCard";
import { SvgLineChart, type LineSeriesConfig } from "@/components/charts/LineChart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  history: HistoryEntry[];
  mode: "drill" | "shooter";
  onClear: (mode?: "all" | "drill" | "shooter") => void;
  onImport?: (entries: HistoryEntry[]) => void;
  onStartRun?: () => void;
}

const DRILL_DURATIONS = ["all", "15s", "30s", "60s", "120s"] as const;
type DrillDurationFilter = (typeof DRILL_DURATIONS)[number];

const DIFFICULTIES = ["all", "easy", "medium", "hard"] as const;
type DifficultyFilter = (typeof DIFFICULTIES)[number];

interface DrillChartRow extends Record<string, unknown> {
  run: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  mode: string;
  diff: string;
  date: string;
}

interface ShooterChartRow extends Record<string, unknown> {
  game: number;
  score: number;
  level: number;
  words: number;
  accuracy: number;
  diff: string;
  date: string;
}

export function HistoryPanel({ history, mode, onClear, onImport, onStartRun }: Props) {
  const [importError, setImportError] = useState<string | null>(null);
  const [drillDuration, setDrillDuration] = useState<DrillDurationFilter>("all");
  const [drillDifficulty, setDrillDifficulty] = useState<DifficultyFilter>("all");
  const [shooterDifficulty, setShooterDifficulty] = useState<DifficultyFilter>("all");
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [pasteOpen, setPasteOpen] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>("");
  const [drillExpanded, setDrillExpanded] = useState<boolean>(false);
  const drillHeadingId = useId();
  const drillContentId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  // Split history by mode
  const drillAll = useMemo(() => history.filter((h) => h.mode !== "shooter"), [history]);
  const shooterAll = useMemo(() => history.filter((h) => h.mode === "shooter"), [history]);

  // Filtered Drill History
  const filteredDrillHistory = useMemo(() => {
    return drillAll.filter((h) => {
      if (drillDuration !== "all") {
        const m = (h.mode || "30").toLowerCase();
        const matchesDuration = m === drillDuration || m === drillDuration.replace("s", "");
        if (!matchesDuration) return false;
      }
      if (drillDifficulty !== "all") {
        if (h.difficulty.toLowerCase() !== drillDifficulty) return false;
      }
      return true;
    });
  }, [drillAll, drillDuration, drillDifficulty]);

  // Filtered Shooter History
  const filteredShooterHistory = useMemo(() => {
    return shooterAll.filter((h) => {
      if (shooterDifficulty !== "all") {
        if (h.difficulty.toLowerCase() !== shooterDifficulty) return false;
      }
      return true;
    });
  }, [shooterAll, shooterDifficulty]);

  // Drill Stats
  const drillBestWpm = useMemo(
    () => filteredDrillHistory.reduce((m, h) => Math.max(m, h.wpm), 0),
    [filteredDrillHistory],
  );
  const drillAvgWpm = useMemo(
    () =>
      filteredDrillHistory.length
        ? filteredDrillHistory.reduce((a, h) => a + h.wpm, 0) / filteredDrillHistory.length
        : 0,
    [filteredDrillHistory],
  );
  const drillAvgAccuracy = useMemo(
    () =>
      filteredDrillHistory.length
        ? filteredDrillHistory.reduce((a, h) => a + h.accuracy, 0) / filteredDrillHistory.length
        : 0,
    [filteredDrillHistory],
  );
  const drillImprovement = useMemo(() => {
    if (filteredDrillHistory.length < 10) return 0;
    const first5 = filteredDrillHistory.slice(-5).reduce((a, h) => a + h.wpm, 0) / 5;
    const last5 = filteredDrillHistory.slice(0, 5).reduce((a, h) => a + h.wpm, 0) / 5;
    return first5 > 0 ? ((last5 - first5) / first5) * 100 : 0;
  }, [filteredDrillHistory]);

  // Drill Chart Data
  const drillChartData: DrillChartRow[] = useMemo(
    () =>
      filteredDrillHistory
        .slice(0, 25)
        .reverse()
        .map((h, i) => ({
          run: i + 1,
          wpm: Math.round(h.wpm),
          rawWpm: Math.round(h.rawWpm || h.wpm),
          accuracy: Math.round(h.accuracy),
          mode: h.mode ? (h.mode.endsWith("s") ? h.mode : `${h.mode}s`) : "30s",
          diff: h.difficulty,
          date: new Date(h.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
    [filteredDrillHistory],
  );

  // Shooter Stats
  const shooterHighScore = useMemo(
    () =>
      filteredShooterHistory.reduce((m, h) => Math.max(m, h.score ?? Math.round(h.wpm * 10)), 0),
    [filteredShooterHistory],
  );
  const shooterBestLevel = useMemo(
    () =>
      filteredShooterHistory.reduce(
        (m, h) => Math.max(m, h.level ?? 1),
        filteredShooterHistory.length > 0 ? 1 : 0,
      ),
    [filteredShooterHistory],
  );
  const shooterAvgScore = useMemo(
    () =>
      filteredShooterHistory.length
        ? filteredShooterHistory.reduce((a, h) => a + (h.score ?? Math.round(h.wpm * 10)), 0) /
          filteredShooterHistory.length
        : 0,
    [filteredShooterHistory],
  );
  const shooterAvgAccuracy = useMemo(
    () =>
      filteredShooterHistory.length
        ? filteredShooterHistory.reduce((a, h) => a + h.accuracy, 0) / filteredShooterHistory.length
        : 0,
    [filteredShooterHistory],
  );

  // Shooter Chart Data
  const shooterChartData: ShooterChartRow[] = useMemo(
    () =>
      filteredShooterHistory
        .slice(0, 25)
        .reverse()
        .map((h, i) => ({
          game: i + 1,
          score: h.score ?? Math.round(h.wpm * 10),
          level: h.level ?? 1,
          words: h.wordsDestroyed ?? h.correct ?? 0,
          accuracy: Math.round(h.accuracy),
          diff: h.difficulty,
          date: new Date(h.date).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
    [filteredShooterHistory],
  );

  const drillSeries: LineSeriesConfig<DrillChartRow>[] = useMemo(
    () => [
      {
        key: "wpm",
        label: "WPM",
        color: "var(--color-primary)",
        strokeWidth: 2.5,
        showDots: true,
        fillArea: true,
        formatValue: (v) => `${v} WPM`,
      },
      {
        key: "accuracy",
        label: "Accuracy",
        color: "var(--color-accent)",
        strokeWidth: 2,
        dashed: true,
        axis: "right",
        formatValue: (v) => `${v}%`,
      },
    ],
    [],
  );

  const shooterSeries: LineSeriesConfig<ShooterChartRow>[] = useMemo(
    () => [
      {
        key: "score",
        label: "Score",
        color: "var(--color-primary)",
        strokeWidth: 2.5,
        showDots: true,
        fillArea: true,
        formatValue: (v) => v.toLocaleString(),
      },
      {
        key: "accuracy",
        label: "Accuracy",
        color: "var(--color-accent)",
        strokeWidth: 2,
        dashed: true,
        axis: "right",
        formatValue: (v) => `${v}%`,
      },
    ],
    [],
  );

  const applyImportJson = (rawText: string) => {
    const res = importHistoryResult(rawText);
    if (!res.ok) {
      if (res.reason === "quota") {
        setImportError("Browser storage is full. Please clear space or export existing runs.");
      } else {
        setImportError("Invalid or corrupted history JSON.");
      }
      return false;
    }
    setImportError(null);
    toast.success(`Imported ${res.list.length} history records.`);
    onImport?.(res.list);
    return true;
  };

  const handleExport = () => {
    const listToExport = mode === "drill" ? drillAll : shooterAll;
    const payload = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      mode,
      entries: listToExport,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode}-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      applyImportJson(String(event.target?.result ?? ""));
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    if (applyImportJson(pasteText)) {
      setPasteText("");
      setPasteOpen(false);
    }
  };

  const handleClearCurrentMode = () => {
    const previous = [...history];
    onClear(mode);
    setConfirmClear(false);
    const label = mode === "drill" ? "Drill history cleared" : "Shooter history cleared";
    toast(label, {
      action: {
        label: "Undo",
        onClick: () => {
          const res = importHistoryResult(JSON.stringify(previous));
          if (res.ok) {
            onImport?.(res.list);
            toast.success("History restored.");
          } else {
            setImportError("Could not restore history — storage is full.");
          }
        },
      },
      duration: 6000,
    });
  };

  const currentModeRunsCount = mode === "drill" ? drillAll.length : shooterAll.length;

  const actionToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={currentModeRunsCount === 0}
        title={`Export ${mode === "drill" ? "Drill" : "Shooter"} history`}
        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <Download className="size-3" />
        Export
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Upload className="size-3" />
        Import
      </button>
      <button
        type="button"
        onClick={() => setPasteOpen(true)}
        title="Paste exported JSON text"
        className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ClipboardPaste className="size-3" />
        Paste
      </button>

      {currentModeRunsCount > 0 ? (
        confirmClear ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClearCurrentMode}
              className="flex cursor-pointer items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
            >
              <Trash2 className="size-3" />
              Clear {mode === "drill" ? "Drill Runs" : "Shooter Games"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="cursor-pointer rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          >
            Clear
          </button>
        )
      ) : null}
    </div>
  );

  const noticesBlock = (
    <>
      {importError ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/15 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{importError}</span>
        </div>
      ) : null}

      {currentModeRunsCount >= 75 ? (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <span>
            Storage notice: You have {currentModeRunsCount}/100 saved runs. Oldest runs will cycle
            out when full.
          </span>
          <button
            type="button"
            onClick={handleExport}
            className="cursor-pointer font-semibold underline hover:no-underline"
          >
            Export backup
          </button>
        </div>
      ) : null}
    </>
  );

  return (
    <section className="panel p-5">
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

      {/* ========================================================= */}
      {/* TIMED DRILL PROGRESS ACCORDION VIEW                       */}
      {/* ========================================================= */}
      {mode === "drill" ? (
        <>
          <button
            type="button"
            onClick={() => setDrillExpanded((prev) => !prev)}
            aria-expanded={drillExpanded}
            aria-controls={drillContentId}
            aria-labelledby={drillHeadingId}
            className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Timer className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id={drillHeadingId}
                    className="text-sm font-semibold tracking-tight text-foreground"
                  >
                    Timed Drill Progress
                  </h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {drillAll.length} {drillAll.length === 1 ? "run" : "runs"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Speed and accuracy tracked over timed test sessions
                </p>
              </div>
            </div>

            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors group-hover:bg-muted group-hover:text-foreground"
            >
              {drillExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          </button>

          <div
            id={drillContentId}
            role="region"
            aria-labelledby={drillHeadingId}
            aria-hidden={!drillExpanded}
            inert={!drillExpanded ? true : undefined}
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
              drillExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-4 border-t border-border/50 pt-4">
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                  {actionToolbar}
                </div>

                {noticesBlock}

                <div className={importError || currentModeRunsCount >= 75 ? "mt-4" : ""}>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Duration:
                      </span>
                      {DRILL_DURATIONS.map((d) => {
                        const active = drillDuration === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setDrillDuration(d)}
                            className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-primary font-semibold text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {d === "all" ? "All Durations" : d}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Diff:
                      </span>
                      {DIFFICULTIES.map((diff) => {
                        const active = drillDifficulty === diff;
                        return (
                          <button
                            key={diff}
                            type="button"
                            aria-pressed={active}
                            onClick={() => setDrillDifficulty(diff)}
                            className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                              active
                                ? "bg-foreground font-semibold text-background"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {diff}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {drillAll.length === 0 ? (
                    <div className="panel mt-6 flex flex-col items-center gap-3 px-6 py-10 text-center">
                      <Trophy className="size-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        No runs yet. Your first result starts the graph.
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
                  ) : filteredDrillHistory.length === 0 ? (
                    <p className="mt-6 text-sm text-muted-foreground">
                      No runs recorded matching the selected filter criteria.
                    </p>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Best WPM
                          </div>
                          <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                            {drillBestWpm.toFixed(0)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Average WPM
                          </div>
                          <div className="font-mono text-2xl font-bold tabular-nums">
                            {drillAvgWpm.toFixed(0)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Accuracy
                          </div>
                          <div className="font-mono text-2xl font-bold tabular-nums text-accent-foreground">
                            {drillAvgAccuracy.toFixed(0)}%
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Drill Runs
                          </div>
                          <div className="font-mono text-2xl font-bold tabular-nums">
                            {filteredDrillHistory.length}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            Trend
                          </div>
                          <div
                            className={`font-mono text-2xl font-bold tabular-nums ${
                              drillImprovement >= 0 ? "text-primary" : "text-destructive"
                            }`}
                          >
                            {drillImprovement > 0 ? "+" : ""}
                            {drillImprovement.toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <ExpandableChartCard
                        title="Timed Drill Progress"
                        badge={`${filteredDrillHistory.length} runs`}
                        subtitle="Speed & accuracy trend across recent sessions"
                        className="mt-5"
                        expandAriaLabel="Expand drill progress chart"
                        collapseAriaLabel="Collapse drill progress chart"
                        footer={() => (
                          <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-1 w-3.5 rounded-full bg-primary" />{" "}
                              WPM
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-accent" />{" "}
                              Accuracy %
                            </span>
                          </div>
                        )}
                      >
                        {(isExpanded) => (
                          <SvgLineChart
                            data={drillChartData}
                            xKey="run"
                            series={drillSeries}
                            expanded={isExpanded}
                            formatXTick={(v) => `#${v}`}
                            formatTooltipTitle={(row) =>
                              `Run #${row.run} · ${row.mode} (${row.diff})`
                            }
                          />
                        )}
                      </ExpandableChartCard>

                      <div className="mt-5">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Recent Drill Runs
                        </div>
                        <ul className="divide-y divide-border/70 text-sm">
                          {filteredDrillHistory.slice(0, 6).map((h) => (
                            <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                              <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                                <span>
                                  {new Date(h.date).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
                                  {h.difficulty}
                                </span>
                                <span className="rounded border border-border bg-secondary/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                                  {h.mode ? (h.mode.endsWith("s") ? h.mode : `${h.mode}s`) : "30s"}
                                </span>
                              </span>
                              <span className="shrink-0 font-mono text-xs tabular-nums sm:text-sm">
                                <strong className="font-semibold text-primary">
                                  {h.wpm.toFixed(0)}
                                </strong>{" "}
                                wpm ·{" "}
                                <span className="text-foreground">
                                  {h.accuracy.toFixed(0)}% acc
                                </span>{" "}
                                ·{" "}
                                <span className="text-xs text-muted-foreground">
                                  {h.consistency.toFixed(0)}% sync
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* ========================================================= */}
      {/* WORD SHOOTER PROGRESS VIEW ONLY                           */}
      {/* ========================================================= */}
      {mode === "shooter" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                <Crosshair className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-foreground">
                    Word Shooter Progress
                  </h2>
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {shooterAll.length} {shooterAll.length === 1 ? "game" : "games"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  High scores, levels reached, and accuracy from arcade battles
                </p>
              </div>
            </div>

            {actionToolbar}
          </div>

          {noticesBlock}

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Difficulty:
                </span>
                {DIFFICULTIES.map((diff) => {
                  const active = shooterDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setShooterDifficulty(diff)}
                      className={`cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                        active
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
              <span className="font-mono text-xs text-muted-foreground">Arcade Mode Tracker</span>
            </div>

            {shooterAll.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No Word Shooter games recorded yet. Launch Word Shooter to battle falling words!
              </p>
            ) : filteredShooterHistory.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                No games found matching the selected difficulty filter.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Trophy className="size-3 text-amber-500" />
                      High Score
                    </div>
                    <div className="font-mono text-2xl font-bold tabular-nums text-amber-500">
                      {shooterHighScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Zap className="size-3 text-accent" />
                      Best Level
                    </div>
                    <div className="font-mono text-2xl font-bold tabular-nums text-accent-foreground">
                      Lvl {shooterBestLevel}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Average Score
                    </div>
                    <div className="font-mono text-2xl font-bold tabular-nums">
                      {Math.round(shooterAvgScore).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      <Target className="size-3 text-primary" />
                      Accuracy
                    </div>
                    <div className="font-mono text-2xl font-bold tabular-nums text-primary">
                      {shooterAvgAccuracy.toFixed(0)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-card p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Games Played
                    </div>
                    <div className="font-mono text-2xl font-bold tabular-nums">
                      {filteredShooterHistory.length}
                    </div>
                  </div>
                </div>

                <ExpandableChartCard
                  title="Word Shooter Progress"
                  badge={`${filteredShooterHistory.length} games`}
                  subtitle="Score & accuracy trend across arcade battles"
                  accent="accent"
                  className="mt-5"
                  expandAriaLabel="Expand shooter progress chart"
                  collapseAriaLabel="Collapse shooter progress chart"
                  footer={() => (
                    <div className="mt-2.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-1 w-3.5 rounded-full bg-primary" /> Score
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-accent" />{" "}
                        Accuracy %
                      </span>
                    </div>
                  )}
                >
                  {(isExpanded) => (
                    <SvgLineChart
                      data={shooterChartData}
                      xKey="game"
                      series={shooterSeries}
                      expanded={isExpanded}
                      formatXTick={(v) => `#${v}`}
                      formatTooltipTitle={(row) =>
                        `Game #${row.game} · Lvl ${row.level} (${row.diff})`
                      }
                    />
                  )}
                </ExpandableChartCard>

                <div className="mt-5">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Shooter Battles
                  </div>
                  <ul className="divide-y divide-border/70 text-sm">
                    {filteredShooterHistory.slice(0, 6).map((h) => {
                      const score = h.score ?? Math.round(h.wpm * 10);
                      const lvl = h.level ?? 1;
                      const words = h.wordsDestroyed ?? h.correct ?? 0;
                      return (
                        <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                            <span>
                              {new Date(h.date).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground">
                              {h.difficulty}
                            </span>
                            <span className="rounded border border-destructive/40 bg-destructive/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-destructive">
                              Lvl {lvl}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums sm:text-sm">
                            <strong className="font-semibold text-amber-500">
                              {score.toLocaleString()}
                            </strong>{" "}
                            pts · <span className="text-foreground">{words} words</span> ·{" "}
                            <span className="text-xs text-muted-foreground">
                              {h.accuracy.toFixed(0)}% acc
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Paste JSON Import Dialog */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="border-border bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg font-bold">Import History JSON</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste exported history JSON text below to merge runs into your local history.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder='{"entries": [...]}'
            rows={6}
            className="w-full rounded-lg border border-border bg-secondary/50 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <DialogFooter>
            <button
              type="button"
              onClick={() => setPasteOpen(false)}
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePasteImport}
              disabled={!pasteText.trim()}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Merge History
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
